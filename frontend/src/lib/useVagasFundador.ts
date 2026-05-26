'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Vagas {
  vagas_total: number;
  vagas_restantes: number;
  ativo: boolean;
}

/**
 * Lê programa_fundador_config e mantém atualizado via Supabase Realtime.
 * Aceita valores iniciais (do SSR) pra renderizar sem flicker.
 */
export function useVagasFundador(inicial?: Partial<Vagas>): Vagas {
  const [v, setV] = useState<Vagas>({
    vagas_total: inicial?.vagas_total ?? 0,
    vagas_restantes: inicial?.vagas_restantes ?? 0,
    ativo: inicial?.ativo ?? false,
  });

  useEffect(() => {
    let cancelado = false;

    async function refetch() {
      const { data } = await supabase
        .from('programa_fundador_config')
        .select('vagas_total, vagas_usadas, ativo')
        .eq('ativo', true)
        .maybeSingle();
      if (cancelado || !data) return;
      setV({
        vagas_total: data.vagas_total ?? 0,
        vagas_restantes: Math.max(0, (data.vagas_total ?? 0) - (data.vagas_usadas ?? 0)),
        ativo: !!data.ativo,
      });
    }

    refetch();

    const channel = supabase
      .channel('programa_fundador_config_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'programa_fundador_config' },
        () => refetch(),
      )
      .subscribe();

    return () => {
      cancelado = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return v;
}
