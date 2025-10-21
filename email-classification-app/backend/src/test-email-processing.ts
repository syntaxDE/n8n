import { EmailProcessingService } from './services/email/EmailProcessingService';

// Test: E-Mail manuell verarbeiten (ohne Polling)
async function testEmailProcessing() {
  const processingService = new EmailProcessingService();

  // Fake Outlook E-Mail (zum Testen)
  const testEmail = {
    id: 'test-123',
    from: {
      emailAddress: {
        address: 'test@kunde.de',
        name: 'Test Kunde'
      }
    },
    subject: 'Dringende Frage - bis morgen!',
    body: {
      content: 'Sehr geehrter Herr Christian, ich brauche bis morgen eine Antwort zur Steuer.'
    },
    bodyPreview: 'Sehr geehrter Herr Christian...',
    receivedDateTime: new Date().toISOString(),
    hasAttachments: false
  };

  // Verarbeiten (braucht User + Token)
  const result = await processingService.processEmail(
    testEmail,
    'your-user-id',
    'your-access-token'
  );

  console.log('Result:', result);
  // Output:
  // {
  //   category: "HOHE_PRIORITAET",
  //   draftCreated: true,
  //   eventCreated: true,
  //   deadline: "2025-10-22T09:00:00"
  // }
}
