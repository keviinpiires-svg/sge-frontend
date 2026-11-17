// Rodapé de todas as telas (inclusive o login): a assinatura do Núcleo de TI da Secretaria.
// Fica fora da impressão (@media print em index.css).
function Rodape() {
  return (
    <footer className="rodape">
      <div className="rodape-conteudo">
        {/* O texto ao lado já diz de quem é o emblema: a imagem é decorativa para o leitor de tela */}
        <img className="rodape-logo" src="/logo-ti.png" alt="" width="32" height="32" />
        <p className="rodape-texto">
          <span>Desenvolvido pelo Núcleo de Tecnologia da Informação e Comunicação</span>
          <span>Secretaria Municipal de Educação · Barra do Choça</span>
        </p>
      </div>
    </footer>
  );
}

export default Rodape;
