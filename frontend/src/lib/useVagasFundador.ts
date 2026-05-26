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
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function refetch() {
      try {
        const res = await fetch('/api/fundador/vagas', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelado) return;
        setV({
          vagas_total: data.vagas_total ?? 0,
          vagas_restantes: data.vagas_restantes ?? 0,
          ativo: !!data.ativo,
        });
      } catch {
        // silencioso — mantém valores iniciais
      }
    }

    refetch();

    try {
      const nome = `pfc_${Math.random().toString(36).slice(2)}`;
      channel = supabase
        .channel(nome)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'programa_fundador_config' },
          () => refetch(),
        )
        .subscribe();
    } catch {
      // realtime opcional — se falhar, mantém só o fetch inicial
    }

    return () => {
      cancelado = true;
      if (channel) {
        try { supabase.removeChannel(channel); } catch { /* noop */ }
      }
    };
  }, []);

  return v;
}
