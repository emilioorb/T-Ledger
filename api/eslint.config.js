import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist/**', 'generated/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['src/modules/*/domain/**/*.ts', 'src/shared/kernel/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@nestjs/*'], message: 'El dominio no depende de Nest.' },
            { group: ['@prisma/*', '**/generated/prisma/**'], message: 'El dominio no depende de Prisma.' },
            { group: ['express', 'node:http'], message: 'El dominio no depende de HTTP.' },
            { group: ['**/modules/*/domain/**'], message: 'Ningún módulo importa el dominio de otro módulo.' },
          ],
        },
      ],
    },
  },
)
