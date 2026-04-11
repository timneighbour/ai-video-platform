import mysql from 'mysql2/promise';

const config = {
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
};

async function checkSchema() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('Connected to database\n');
    
    // Get table structure
    const [rows] = await connection.execute('DESCRIBE musicVideoJobs');
    console.log('Current musicVideoJobs columns:');
    console.log('================================');
    rows.forEach(row => {
      console.log(`${row.Field}: ${row.Type} (${row.Null === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    console.log(`\nTotal columns: ${rows.length}`);
    
    // Check for missing columns
    const expectedColumns = [
      'isKidsVideo', 'kidsTargetAge', 'kidsEducationalTheme', 'kidsEnableSingalong',
      'kidsFriendlyIntensity', 'lyrics', 'lyricsStatus', 'captionsEnabled',
      'captionStyle', 'captionBackground', 'captionFontSize', 'captionFontStyle',
      'captionTextColour', 'captionHighlightColour', 'captionKaraokeMode',
      'captionSafeArea', 'lyricsApproved'
    ];
    
    const actualColumns = rows.map(r => r.Field);
    const missing = expectedColumns.filter(col => !actualColumns.includes(col));
    
    if (missing.length > 0) {
      console.log(`\n❌ Missing columns (${missing.length}):`);
      missing.forEach(col => console.log(`  - ${col}`));
    } else {
      console.log('\n✅ All expected columns exist!');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

checkSchema();
