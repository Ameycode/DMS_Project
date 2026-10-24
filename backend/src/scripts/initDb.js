const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../.env') });

function initDatabase() {
  console.log('🔄 Initializing EV Charging System MySQL Database...');

  const dbHost = process.env.DB_HOST || '127.0.0.1';
  const dbPort = process.env.DB_PORT || '3306';
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';
  const mysqlCandidates = [
    process.env.MYSQL_BIN,
    'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysql.exe',
    'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe',
    'C:\\xampp\\mysql\\bin\\mysql.exe'
  ].filter(Boolean);
  const mysqlBin = mysqlCandidates.find((candidate) => fs.existsSync(candidate));
  const dbDir = path.join(__dirname, '../../../database');

  const files = [
    'schema.sql',
    'views.sql',
    'procedures.sql',
    'triggers.sql',
    'seed.sql'
  ];

  try {
    if (!mysqlBin) {
      throw new Error(
        'MySQL client not found. Install MySQL or set MYSQL_BIN in backend/.env to the full path of mysql.exe.'
      );
    }

    for (const file of files) {
      console.log(`Executing ${file}...`);
      const filePath = path.join(dbDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      execFileSync(
        mysqlBin,
        ['-h', dbHost, '-P', dbPort, '-u', dbUser],
        {
          input: sql,
          stdio: ['pipe', 'inherit', 'inherit'],
          env: { ...process.env, MYSQL_PWD: dbPassword }
        }
      );
      console.log(`   ✅ ${file} applied successfully.`);
    }

    console.log('🎉 Database initialization complete!');
  } catch (err) {
    console.error(
      '❌ Database initialization error:',
      err.message.replace(/MYSQL_PWD=[^\s]+|-[pP][^\s]+/g, 'PASSWORD_REDACTED')
    );
    process.exit(1);
  }
}

if (require.main === module) {
  initDatabase();
}

module.exports = initDatabase;
