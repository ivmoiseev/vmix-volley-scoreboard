import React from 'react';
import { space, radius } from '../theme/tokens';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: space.xl,
          textAlign: 'center',
          maxWidth: '600px',
          margin: `${space.xl} auto`,
        }}>
          <h2 style={{ color: 'var(--color-danger)' }}>Произошла ошибка</h2>
          <p style={{ marginBottom: space.md }}>
            Приложение столкнулось с неожиданной ошибкой.
          </p>
          <details style={{
            textAlign: 'left',
            backgroundColor: 'var(--color-surface-muted)',
            padding: space.md,
            borderRadius: radius.sm,
            marginBottom: space.md,
          }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
              Детали ошибки
            </summary>
            <pre style={{
              marginTop: space.sm,
              fontSize: '0.9rem',
              overflow: 'auto',
            }}>
              {this.state.error?.toString()}
            </pre>
          </details>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              padding: `${space.sm} ${space.lg}`,
              fontSize: '1rem',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: radius.sm,
              cursor: 'pointer',
            }}
          >
            Перезагрузить приложение
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

