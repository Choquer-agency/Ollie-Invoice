/**
 * Cron Diagnostic Tool
 * 
 * This script helps diagnose issues with the recurring invoice cron job.
 * 
 * Usage:
 *   npm run test-cron <APP_URL> <CRON_SECRET>
 * 
 * Example:
 *   npm run test-cron https://ollie-invoice.railway.app YOUR_SECRET_HERE
 */

async function testCron() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('❌ Missing arguments!\n');
    console.log('Usage: npm run test-cron <APP_URL> <CRON_SECRET>\n');
    console.log('Example:');
    console.log('  npm run test-cron https://ollie-invoice.railway.app abc123...\n');
    process.exit(1);
  }

  const [appUrl, cronSecret] = args;
  const cleanUrl = appUrl.trim().replace(/\/$/, '');

  console.log('\n🔍 Recurring Invoice Cron Diagnostics\n');
  console.log(`Testing: ${cleanUrl}\n`);
  console.log('━'.repeat(60));

  // Test 1: Check status endpoint
  console.log('\n📊 Test 1: Checking cron status...\n');
  
  try {
    const statusResponse = await fetch(`${cleanUrl}/api/cron/recurring-invoices/status`, {
      headers: {
        'x-cron-secret': cronSecret
      }
    });

    if (statusResponse.status === 401) {
      console.error('❌ FAILED: Unauthorized (401)');
      console.error('   → CRON_SECRET mismatch or not configured on server\n');
      const data = await statusResponse.json();
      console.error('   Response:', data);
      process.exit(1);
    }

    if (statusResponse.status === 500) {
      console.error('❌ FAILED: Server Error (500)');
      const data = await statusResponse.json();
      console.error('   Response:', data);
      
      if (data.error === 'Cron endpoint not configured') {
        console.error('\n   → CRON_SECRET environment variable not set on server!\n');
      }
      process.exit(1);
    }

    if (!statusResponse.ok) {
      console.error(`❌ FAILED: HTTP ${statusResponse.status}`);
      const data = await statusResponse.json();
      console.error('   Response:', data);
      process.exit(1);
    }

    const statusData = await statusResponse.json();
    console.log('✅ Status check successful!\n');
    console.log('📋 Recurring Invoice Status:');
    console.log(JSON.stringify(statusData, null, 2));

    // Analyze the status
    console.log('\n━'.repeat(60));
    console.log('\n📈 Analysis:\n');

    if (statusData.totalRecurring === 0) {
      console.log('⚠️  No recurring invoices found in the database');
      console.log('   → Create a recurring invoice from the UI first\n');
    } else {
      console.log(`✓ Found ${statusData.totalRecurring} recurring invoice(s)`);
      
      if (statusData.dueToday === 0) {
        console.log(`⚠️  None are due today (${statusData.today})`);
        console.log('   → Check nextRecurringDate on your invoices\n');
      } else {
        console.log(`✓ ${statusData.dueToday} invoice(s) due today\n`);
      }
    }

  } catch (error: any) {
    console.error('❌ FAILED: Connection error');
    console.error(`   ${error.message}\n`);
    console.error('   → Check that the app URL is correct and the app is running');
    process.exit(1);
  }

  // Test 2: Manually trigger cron
  console.log('━'.repeat(60));
  console.log('\n🚀 Test 2: Manually triggering cron job...\n');

  try {
    const cronResponse = await fetch(`${cleanUrl}/api/cron/recurring-invoices`, {
      method: 'POST',
      headers: {
        'x-cron-secret': cronSecret
      }
    });

    if (!cronResponse.ok) {
      console.error(`❌ FAILED: HTTP ${cronResponse.status}`);
      const data = await cronResponse.json();
      console.error('   Response:', data);
      process.exit(1);
    }

    const cronData = await cronResponse.json();
    console.log('✅ Cron job executed!\n');
    console.log('📊 Results:');
    console.log(JSON.stringify(cronData, null, 2));

    // Analyze results
    console.log('\n━'.repeat(60));
    console.log('\n📈 Summary:\n');

    if (cronData.processed === 0) {
      console.log('⚠️  No invoices were processed');
      console.log('   → Either no invoices are due, or there was an issue\n');
    } else {
      console.log(`✓ Processed ${cronData.processed} invoice(s)`);
      console.log(`✓ Sent ${cronData.sent} email(s)\n`);

      if (cronData.errors && cronData.errors.length > 0) {
        console.log('⚠️  Some errors occurred:');
        cronData.errors.forEach((err: string) => {
          console.log(`   • ${err}`);
        });
        console.log('');
      }
    }

    console.log('━'.repeat(60));
    console.log('\n✅ All tests completed!\n');

    if (cronData.processed > 0 && cronData.errors.length === 0) {
      console.log('🎉 Everything is working correctly!\n');
    } else if (cronData.processed === 0) {
      console.log('💡 Next steps:');
      console.log('   1. Create a recurring invoice from the UI');
      console.log('   2. Set nextRecurringDate to today or earlier');
      console.log('   3. Run this test again\n');
    }

  } catch (error: any) {
    console.error('❌ FAILED: Connection error');
    console.error(`   ${error.message}\n`);
    process.exit(1);
  }
}

testCron().catch(console.error);

