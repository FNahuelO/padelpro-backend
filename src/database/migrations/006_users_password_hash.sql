-- Alinea users con el esquema MVP (auth usa password_hash).
-- Seguro si la tabla ya fue creada por un esquema anterior sin esta columna.

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'password'
  ) THEN
    UPDATE users
    SET password_hash = password
    WHERE password_hash IS NULL AND password IS NOT NULL;

    ALTER TABLE users DROP COLUMN password;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE password_hash IS NULL) THEN
    ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
  END IF;
END $$;
