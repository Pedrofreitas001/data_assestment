import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Variante compacta para o painel do assistente. */
  compact?: boolean;
  onReset?: () => void;
}

/** Isola falhas de renderização: a tela afetada mostra um aviso em vez de derrubar o app. */
export default class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Falha de renderização isolada:", error, info.componentStack);
  }

  reset = () => {
    this.props.onReset?.();
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.compact)
      return (
        <div className="error-box compact">
          <b>O assistente encontrou um problema.</b>
          <span className="small muted">A conversa foi reiniciada para continuar.</span>
          <button className="btn btn-sm" onClick={this.reset}>
            Reabrir assistente
          </button>
        </div>
      );
    return (
      <div className="error-box">
        <h3>Algo deu errado nesta tela</h3>
        <p className="muted">Seus dados estão salvos. Tente carregar de novo; se persistir, volte ao início.</p>
        <div className="row" style={{ justifyContent: "center" }}>
          <button className="btn btn-primary" onClick={this.reset}>
            Tentar novamente
          </button>
          <a className="btn" href="/">
            Voltar ao início
          </a>
        </div>
        <details className="xs muted" style={{ marginTop: 16 }}>
          <summary>Detalhe técnico</summary>
          <code>{this.state.error.message}</code>
        </details>
      </div>
    );
  }
}
