import 'dotenv/config';
import { buildOpenFgaClient } from '@auth0/ai';
import { listObjects } from './fga';

/**
 * Check FGA configuration and permissions status
 */
async function checkFGAStatus() {
  console.log('🔍 Checking FGA Configuration...\n');

  // Test permissions for the user
  const testUserEmail = 'rohittcodes@gmail.com';
  console.log(`\n👤 Testing permissions for user: ${testUserEmail}`);
  
  try {
    // Test document permissions
    const documentPermissions = await listObjects(testUserEmail, 'document', 'can_read');
    console.log(`📄 Documents with read access: ${documentPermissions.length}`);
    
    if (documentPermissions.length === 0) {
      console.log('⚠️  No documents found with read access');
    } else {
      console.log(`📋 Document IDs: ${documentPermissions.slice(0, 5).join(', ')}${documentPermissions.length > 5 ? '...' : ''}`);
    }

  } catch (error: any) {
    console.log('❌ Permission check failed:');
    console.log(`   Error: ${error.message}`);
  }
}

// Run the status check if this script is executed directly
if (require.main === module) {
  checkFGAStatus()
    .then(() => {
      console.log('\n✅ FGA status check completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ FGA status check failed:', error);
      process.exit(1);
    });
}

export { checkFGAStatus };
