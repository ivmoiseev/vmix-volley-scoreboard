import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
function ScoreButtons({ teamAName, teamBName, onScoreChange, disabled = false }) {
    const buttonStyle = {
        padding: '1rem 2rem',
        fontSize: '1.5rem',
        fontWeight: 'bold',
        border: 'none',
        borderRadius: '4px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        minWidth: '120px',
        opacity: disabled ? 0.6 : 1,
    };
    return (_jsxs("div", { style: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '1rem',
        }, children: [_jsxs("div", { style: { textAlign: 'center' }, children: [_jsx("div", { style: { marginBottom: '0.5rem', fontWeight: 'bold' }, children: teamAName }), _jsxs("div", { style: { display: 'flex', gap: '0.5rem', justifyContent: 'center' }, children: [_jsx("button", { onClick: () => !disabled && onScoreChange('A', -1), disabled: disabled, style: {
                                    ...buttonStyle,
                                    backgroundColor: '#e74c3c',
                                    color: 'white',
                                }, children: "-1" }), _jsx("button", { onClick: () => !disabled && onScoreChange('A', 1), disabled: disabled, style: {
                                    ...buttonStyle,
                                    backgroundColor: '#27ae60',
                                    color: 'white',
                                }, children: "+1" })] })] }), _jsxs("div", { style: { textAlign: 'center' }, children: [_jsx("div", { style: { marginBottom: '0.5rem', fontWeight: 'bold' }, children: teamBName }), _jsxs("div", { style: { display: 'flex', gap: '0.5rem', justifyContent: 'center' }, children: [_jsx("button", { onClick: () => !disabled && onScoreChange('B', -1), disabled: disabled, style: {
                                    ...buttonStyle,
                                    backgroundColor: '#e74c3c',
                                    color: 'white',
                                }, children: "-1" }), _jsx("button", { onClick: () => !disabled && onScoreChange('B', 1), disabled: disabled, style: {
                                    ...buttonStyle,
                                    backgroundColor: '#27ae60',
                                    color: 'white',
                                }, children: "+1" })] })] })] }));
}
export default ScoreButtons;
