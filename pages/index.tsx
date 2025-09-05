import { Toaster } from 'react-hot-toast';
import ContentEngineUI from '@/components/ContentEngineUI';

export default function Home() {
  return (
    <>
      <ContentEngineUI />
      <Toaster position="top-right" />
    </>
  );
}
