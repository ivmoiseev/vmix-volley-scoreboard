import React from 'react';

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
          padding: '2rem',
          textAlign: 'center',
          maxWidth: '600px',
          margin: '2rem auto',
        }}>
          <h2 style={{ color: '#e74c3c' }}>Произошла ошибка</h2>
          <p style={{ marginBottom: '1rem' }}>
            Приложение столкнулось с неожиданной ошибкой.
          </p>
          <details style={{
            textAlign: 'left',
            backgroundColor: '#ecf0f1',
            padding: '1rem',
            borderRadius: '4px',
            marginBottom: '1rem',
          }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
              Детали ошибки
            </summary>
            <pre style={{
              marginTop: '0.5rem',
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
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
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

