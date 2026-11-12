import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useLayout } from '@galokids/core';
import { SectionGrid } from '@/navigation/Nav';

/**
 * Where the app opens.
 *
 * On a phone, the grid of sections. On a wide screen the rail is already
 * there, so land straight on the till — which is what the device is for.
 */
export default function Home() {
  const { wide } = useLayout();
  const router = useRouter();

  useEffect(() => {
    if (wide) router.replace('/(admin)/till');
  }, [wide, router]);

  return <SectionGrid />;
}
