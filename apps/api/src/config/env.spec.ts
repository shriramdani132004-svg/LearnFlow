import { validateEnvironment } from './env';

const ORIGINAL_ENV = process.env;

function withEnv(overrides: Record<string, string | undefined>, run: () => void) {
  const next: NodeJS.ProcessEnv = { ...ORIGINAL_ENV };
  for (const key of [
    'NODE_ENV',
    'DATABASE_URL',
    'DIRECT_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'FRONTEND_ORIGIN',
    'COOKIE_SECURE',
    'COOKIE_SAME_SITE',
    'PORT',
  ]) {
    delete next[key];
  }
  Object.assign(next, {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/learnflow',
    JWT_SECRET: 'a'.repeat(40),
    JWT_REFRESH_SECRET: 'b'.repeat(40),
    FRONTEND_ORIGIN: 'https://learnflow.example.com/',
  });
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete next[key];
    else next[key] = value;
  }
  process.env = next;
  try {
    run();
  } finally {
    process.env = ORIGINAL_ENV;
  }
}

describe('validateEnvironment', () => {
  it('normalizes valid configuration', () => {
    withEnv({}, () => {
      const config = validateEnvironment();
      expect(config.frontendOrigin).toBe('https://learnflow.example.com');
      expect(config.port).toBe(4000);
      expect(config.cookieSecure).toBe(false);
      expect(config.cookieSameSite).toBe('lax');
    });
  });

  it('defaults cookie security to true in production', () => {
    withEnv({ NODE_ENV: 'production' }, () => {
      expect(validateEnvironment().cookieSecure).toBe(true);
    });
  });

  it('requires a PostgreSQL connection string', () => {
    withEnv({ DATABASE_URL: 'mysql://localhost/learnflow' }, () => {
      expect(() => validateEnvironment()).toThrow('PostgreSQL');
    });
  });

  it('rejects short JWT secrets', () => {
    withEnv({ JWT_SECRET: 'short' }, () => {
      expect(() => validateEnvironment()).toThrow('at least 32 characters');
    });
  });

  it('rejects reusing the same secret for access and refresh tokens', () => {
    withEnv({ JWT_REFRESH_SECRET: 'a'.repeat(40) }, () => {
      expect(() => validateEnvironment()).toThrow('must be different');
    });
  });

  it('rejects malformed frontend origins', () => {
    withEnv({ FRONTEND_ORIGIN: 'learnflow.example.com' }, () => {
      expect(() => validateEnvironment()).toThrow('absolute http(s) URL');
    });
  });

  it('rejects invalid cookie same-site values', () => {
    withEnv({ COOKIE_SAME_SITE: 'sometimes' }, () => {
      expect(() => validateEnvironment()).toThrow('COOKIE_SAME_SITE');
    });
  });

  it('rejects non-positive ports', () => {
    withEnv({ PORT: '0' }, () => {
      expect(() => validateEnvironment()).toThrow('positive integer');
    });
  });
});
