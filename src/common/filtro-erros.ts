import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

/**
 * Resposta de erro única pra API inteira. Antes, cada rota devolvia o erro
 * cru com status 409: o navegador recebia detalhes do banco e tudo parecia
 * "conflito", até "não encontrado" e "sem permissão".
 *
 * - HttpException (BadRequest, NotFound, Forbidden, validação, limite de
 *   requisições): status e corpo dela, como o Nest faz por padrão. O front
 *   lê `message`.
 * - Erro conhecido do Prisma: status e mensagem em português.
 * - Qualquer outra coisa: 500 com mensagem genérica; o detalhe vai pro log.
 */
@Catch()
export class FiltroErros implements ExceptionFilter {
  private readonly logger = new Logger('Erro');

  catch(erro: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    if (res.headersSent) return;

    if (erro instanceof HttpException) {
      const status = erro.getStatus();
      const corpo = erro.getResponse();
      return res
        .status(status)
        .json(typeof corpo === 'string' ? { statusCode: status, message: corpo } : corpo);
    }

    if (erro instanceof Prisma.PrismaClientKnownRequestError) {
      const conhecido = ERROS_PRISMA[erro.code];
      if (conhecido) {
        return res
          .status(conhecido.status)
          .json({ statusCode: conhecido.status, message: conhecido.message });
      }
    }

    this.logger.error(
      `${req.method} ${req.originalUrl}: ${erro instanceof Error ? erro.stack : JSON.stringify(erro)}`,
    );
    return res.status(500).json({
      statusCode: 500,
      message: 'Erro interno. Tente de novo em instantes.',
    });
  }
}

const ERROS_PRISMA: Record<string, { status: number; message: string }> = {
  P2025: { status: 404, message: 'Registro não encontrado.' },
  P2002: { status: 409, message: 'Já existe um registro com esses dados.' },
  P2003: {
    status: 409,
    message: 'Este registro está ligado a outros dados e não pode ser alterado assim.',
  },
};
