import InvoiceRecognition from '@/components/invoice-recognition';
import GoogleCloudApiTester from '@/components/google-cloud-api-tester';

export const metadata = {
  title: 'Распознавание счетов | CRM Glazing',
  description: 'Распознавание и анализ счетов'
};

export default function InvoiceRecognitionPage() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <h1 className="text-2xl font-bold mb-6">Распознавание счетов</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <InvoiceRecognition />
        </div>
        <div>
          <GoogleCloudApiTester />
        </div>
      </div>
    </div>
  );
}