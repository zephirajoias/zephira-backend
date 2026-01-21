import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/services/prisma.service';
import { AdminService } from './admin.service';

const mockPrismaService = {
  uSUARIO: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

describe('AdminService', () => {
  let service: AdminService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('cria admin com sucesso', async () => {
    const dto = {
      NM_USUARIO: 'Administrador Teste',
      DS_EMAIL: 'admin@zephira.com',
      DS_SENHA: 'Senha@123',
      NR_TELEFONE: '71999998888',
      TS_CRIACAO: new Date('2025-01-01T10:00:00Z'),
      TS_ATUALIZACAO: new Date('2025-01-01T10:00:00Z'),
    };

    mockPrismaService.uSUARIO.findUnique.mockResolvedValue(null);

    mockPrismaService.uSUARIO.create.mockResolvedValue({
      id: 1,
      NM_USUARIO: dto.NM_USUARIO,
      DS_EMAIL: dto.DS_EMAIL,
      NR_TELEFONE: dto.NR_TELEFONE,
      TS_CRIACAO: dto.TS_CRIACAO,
      TS_ATUALIZACAO: dto.TS_ATUALIZACAO,
    });

    const expectedResult = {
      id: 1,
      NM_USUARIO: dto.NM_USUARIO,
      DS_EMAIL: dto.DS_EMAIL,
      NR_TELEFONE: dto.NR_TELEFONE,
      TS_CRIACAO: dto.TS_CRIACAO,
      TS_ATUALIZACAO: dto.TS_ATUALIZACAO,
    };

    const result = await service.create(dto);

    expect(result).toEqual(expectedResult);

    expect(prisma.uSUARIO.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          NM_USUARIO: dto.NM_USUARIO,
          DS_EMAIL: dto.DS_EMAIL,
          NR_TELEFONE: dto.NR_TELEFONE,
          TP_PERFIL: 'ADMIN',
          TS_CRIACAO: dto.TS_CRIACAO,
          TS_ATUALIZACAO: dto.TS_ATUALIZACAO,
          DS_SENHA_HASH: expect.any(String),
        }),
      }),
    );
  });
});
