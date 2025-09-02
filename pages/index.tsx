import { Toaster } from 'react-hot-toast';
import AIAppFactoryUI from '../components/AIAppFactoryUI';

export default function Home() {
  return (
    <>
      <AIAppFactoryUI />
      <Toaster position="top-right" />
    </>
  );
}
