export function assertSeedAllowed({ appEnv, nodeEnv, allowTestSeed }) {
  const environment = appEnv || nodeEnv || 'development';
  if (environment === 'production') {
    throw new Error('Seed data is disabled in production');
  }
  if (!['development', 'uat'].includes(environment)) {
    throw new Error('Seed data is allowed only in Development or UAT');
  }
  if (allowTestSeed !== 'true') {
    throw new Error('Set ALLOW_TEST_SEED=true to seed Development or UAT data');
  }
}
