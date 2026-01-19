import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo } from 'react';
const StatusIndicators = memo(function StatusIndicators({ isSetball, isMatchball }) {
    return (_jsxs("div", { style: {
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            marginBottom: '1rem',
        }, children: [isSetball && (_jsx("div", { style: {
                    padding: '0.5rem 1rem',
                    backgroundColor: '#f39c12',
                    color: 'white',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                }, children: "\u0421\u0415\u0422\u0411\u041E\u041B" })), isMatchball && (_jsx("div", { style: {
                    padding: '0.5rem 1rem',
                    backgroundColor: '#e74c3c',
                    color: 'white',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                }, children: "\u041C\u0410\u0422\u0427\u0411\u041E\u041B" }))] }));
});
export default StatusIndicators;
