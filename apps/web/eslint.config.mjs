import nextPlugin from '@next/eslint-plugin-next';

export default [{ ignores: ['.next/**'] }, { plugins: { '@next/next': nextPlugin }, rules: { ...nextPlugin.configs.recommended.rules } }];
