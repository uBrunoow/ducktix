const PERGUNTAS = [
  {
    pergunta: 'Como funciona a compra de um ingresso?',
    resposta:
      'Você escolhe o evento, seleciona o lote disponível e confirma o pedido. O ingresso emitido fica associado à sua inscrição e é validado no check-in do evento.',
  },
  {
    pergunta: 'O que muda entre "último lote" e "esgotado"?',
    resposta:
      'Último lote é o lote final ainda aberto, ou um lote com poucas vagas restantes — ainda dá para comprar. Esgotado quer dizer que não há mais vagas disponíveis para este evento no momento.',
  },
  {
    pergunta: 'Posso cancelar um pedido depois de confirmado?',
    resposta:
      'Sim, dentro das condições definidas por cada organizador. O cancelamento está previsto no domínio do Ducktix como parte do ciclo do pedido, junto com pagamento e reembolso.',
  },
  {
    pergunta: 'Como eu crio e publico o meu próprio evento?',
    resposta:
      'Pelo painel do organizador: você cadastra o evento, define local ou modalidade online, cria os tipos de ingresso e os lotes, e publica quando estiver pronto para vender.',
  },
];

export function Faq() {
  return (
    <div className="mt-10">
      {PERGUNTAS.map((item) => (
        <details className="group border-b border-line" key={item.pergunta}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[15px] font-semibold marker:content-none hover:text-brand-ink [&::-webkit-details-marker]:hidden">
            {item.pergunta}
            <span
              aria-hidden="true"
              className="relative size-3.5 flex-none before:absolute before:left-1/2 before:top-1/2 before:h-[1.5px] before:w-3.5 before:-translate-x-1/2 before:-translate-y-1/2 before:rounded-full before:bg-current after:absolute after:left-1/2 after:top-1/2 after:h-3.5 after:w-[1.5px] after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:bg-current after:transition-transform after:duration-200 after:ease-[cubic-bezier(0.16,1,0.3,1)] group-open:after:rotate-90 group-open:after:scale-y-0"
            />
          </summary>
          <p className="m-0 mb-6 max-w-[80ch] text-[15px] leading-[1.7] text-fg-muted">
            {item.resposta}
          </p>
        </details>
      ))}
    </div>
  );
}
