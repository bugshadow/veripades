exports.up = pgm => {
    pgm.createExtension('pgcrypto', { ifNotExists: true });

    pgm.createTable('users', {
        id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
        email: { type: 'varchar(255)', notNull: true, unique: true },
        password_hash: { type: 'varchar(255)', notNull: true },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
    });
    pgm.sql("INSERT INTO users (id, email, password_hash) VALUES ('00000000-0000-4000-8000-000000000001', 'test@dgssi.ma', '$2b$12$RHMnwnFbesFrW7Py/MTyDu0j3BEkEa5lFxDfz6LK.7xJeGL4b1qjG') ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash;");
    pgm.createTable('certificates', {
        id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
        user_id: {
            type: 'uuid',
            notNull: true,
            references: 'users(id)',
            onDelete: 'RESTRICT'
        },
        serial_number: { type: 'varchar(255)', notNull: true, unique: true },
        public_key: { type: 'text', notNull: true },
        valid_from: { type: 'timestamp', notNull: true },
        valid_to: { type: 'timestamp', notNull: true },
        is_revoked: { type: 'boolean', notNull: true, default: false },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
    });

    pgm.createTable('documents', {
        id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
        user_id: {
            type: 'uuid',
            notNull: true,
            references: 'users(id)',
            onDelete: 'RESTRICT'
        },
        original_name: { type: 'varchar(255)', notNull: true },
        file_path: { type: 'varchar(500)', notNull: true },
        mime_type: { type: 'varchar(255)', notNull: true },
        size: { type: 'integer', notNull: true },
        signed_file_path: { type: 'varchar(500)' },
        before_hash: { type: 'varchar(64)' },
        after_hash: { type: 'varchar(64)' },
        status: { type: 'varchar(50)', notNull: true, default: 'PENDING' },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
        updated_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
    });

    pgm.createTable('signatures', {
        id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
        document_id: {
            type: 'uuid',
            notNull: true,
            references: 'documents(id)',
            onDelete: 'RESTRICT'
        },
        certificate_id: {
            type: 'uuid',
            notNull: true,
            references: 'certificates(id)',
            onDelete: 'RESTRICT'
        },
        hash_before: { type: 'varchar(255)', notNull: true },
        hash_after: { type: 'varchar(255)', notNull: true },
        created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
    });

    pgm.createTable('timestamps', {
        id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
        signature_id: {
            type: 'uuid',
            notNull: true,
            references: 'signatures(id)',
            onDelete: 'RESTRICT'
        },
        serial_number: { type: 'varchar(255)', notNull: true, unique: true },
        generated_at: { type: 'timestamp', notNull: true },
    });
};

exports.down = pgm => {
    pgm.dropTable('timestamps');
    pgm.dropTable('signatures');
    pgm.dropTable('documents');
    pgm.dropTable('certificates');
    pgm.dropTable('users');
    pgm.dropExtension('pgcrypto');
};



