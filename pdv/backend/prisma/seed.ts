/// <reference types="node" />
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, 12);
}

async function main() {
  const adminSenha = process.env.SEED_ADMIN_PASSWORD?.trim() || 'admin123';
  const caixaSenha = process.env.SEED_CAIXA_PASSWORD?.trim() || 'caixa123';

  const [adminSenhaHash, caixaSenhaHash] = await Promise.all([
    hashSenha(adminSenha),
    hashSenha(caixaSenha),
  ]);

  await prisma.user.upsert({
    where: { email: 'admin@conveniencia.com' },
    update: {
      nome: 'Administrador',
      role: 'ADMIN',
      senhaHash: adminSenhaHash,
      ativo: true,
      tentativasLogin: 0,
      bloqueadoAte: null,
    },
    create: {
      email: 'admin@conveniencia.com',
      nome: 'Administrador',
      role: 'ADMIN',
      senhaHash: adminSenhaHash,
    },
  });

  await prisma.user.upsert({
    where: { email: 'caixa@conveniencia.com' },
    update: {
      nome: 'Operador de Caixa',
      role: 'CAIXA',
      senhaHash: caixaSenhaHash,
      ativo: true,
      tentativasLogin: 0,
      bloqueadoAte: null,
    },
    create: {
      email: 'caixa@conveniencia.com',
      nome: 'Operador de Caixa',
      role: 'CAIXA',
      senhaHash: caixaSenhaHash,
    },
  });

  await prisma.categoria.upsert({
    where: { nome: 'Bebidas' },
    update: {},
    create: { nome: 'Bebidas' },
  });

  await prisma.categoria.upsert({
    where: { nome: 'Snacks' },
    update: {},
    create: { nome: 'Snacks' },
  });

  await prisma.fornecedor.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      nome: 'Distribuidora Central',
      cnpj: '12.345.678/0001-90',
      email: 'contato@distribuidoracentral.com',
      telefone: '(11) 3333-4444',
      endereco: 'Rua das Industrias, 100',
    },
  });

  console.log('Seed concluido.');
}

main()
  .catch((error: unknown) => {
    console.error('Erro ao executar seed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
