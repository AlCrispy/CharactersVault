import { useEffect, useState } from 'react';
import { AppFooter } from './app/AppFooter';
import { CharacterList } from './app/CharacterList';
import { useRoute } from './app/route';
import { SheetHost } from './app/SheetHost';
import { requestPersistence } from './core/storage';
import { ConfirmProvider } from './ui/confirm';

export default function App() {
  const route = useRoute();
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    void requestPersistence().then(setPersisted);
  }, []);

  return (
    <ConfirmProvider>
      {route.name === 'sheet' ? <SheetHost key={route.id} id={route.id} /> : <CharacterList persisted={persisted} />}
      <AppFooter />
    </ConfirmProvider>
  );
}
