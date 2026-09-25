import * as fs from 'fs';
import * as path from 'path';

// Em produção as chaves vêm das variáveis JWT_PRIVATE_KEY / JWT_PUBLIC_KEY
// (PEM numa linha só, com "\n" literal no lugar das quebras). Os arquivos em
// keys/ são só uma reserva pro desenvolvimento local.
function lerChave(variavel: string, arquivo: string): string {
  const doAmbiente = process.env[variavel];
  if (doAmbiente) {
    return doAmbiente.replace(/^"|"$/g, '').replace(/\\n/g, '\n');
  }

  const caminho = path.join(process.cwd(), 'keys', arquivo);
  if (fs.existsSync(caminho)) {
    return fs.readFileSync(caminho, 'utf8');
  }

  throw new Error(
    `Chave JWT ausente: defina ${variavel} no ambiente ou crie keys/${arquivo}.`,
  );
}

export const lerChavePrivada = () => lerChave('JWT_PRIVATE_KEY', 'private.pem');
export const lerChavePublica = () => lerChave('JWT_PUBLIC_KEY', 'public.pem');
