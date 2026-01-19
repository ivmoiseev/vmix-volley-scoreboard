import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
            return (_jsxs("div", { style: {
                    padding: '2rem',
                    textAlign: 'center',
                    maxWidth: '600px',
                    margin: '2rem auto',
                }, children: [_jsx("h2", { style: { color: '#e74c3c' }, children: "\u041F\u0440\u043E\u0438\u0437\u043E\u0448\u043B\u0430 \u043E\u0448\u0438\u0431\u043A\u0430" }), _jsx("p", { style: { marginBottom: '1rem' }, children: "\u041F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u0441\u0442\u043E\u043B\u043A\u043D\u0443\u043B\u043E\u0441\u044C \u0441 \u043D\u0435\u043E\u0436\u0438\u0434\u0430\u043D\u043D\u043E\u0439 \u043E\u0448\u0438\u0431\u043A\u043E\u0439." }), _jsxs("details", { style: {
                            textAlign: 'left',
                            backgroundColor: '#ecf0f1',
                            padding: '1rem',
                            borderRadius: '4px',
                            marginBottom: '1rem',
                        }, children: [_jsx("summary", { style: { cursor: 'pointer', fontWeight: 'bold' }, children: "\u0414\u0435\u0442\u0430\u043B\u0438 \u043E\u0448\u0438\u0431\u043A\u0438" }), _jsx("pre", { style: {
                                    marginTop: '0.5rem',
                                    fontSize: '0.9rem',
                                    overflow: 'auto',
                                }, children: this.state.error?.toString() })] }), _jsx("button", { onClick: () => {
                            this.setState({ hasError: false, error: null });
                            window.location.reload();
                        }, style: {
                            padding: '0.75rem 1.5rem',
                            fontSize: '1rem',
                            backgroundColor: '#3498db',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                        }, children: "\u041F\u0435\u0440\u0435\u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435" })] }));
        }
        return this.props.children;
    }
}
export default ErrorBoundary;
