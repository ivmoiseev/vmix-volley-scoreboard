import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
function ServeControl({ servingTeam, teamAName, teamBName, onChange }) {
    const servingTeamName = servingTeam === 'A' ? teamAName : teamBName;
    const isLeftDisabled = servingTeam === 'A';
    const isRightDisabled = servingTeam === 'B';
    return (_jsxs("div", { style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            padding: '0.5rem',
            backgroundColor: '#ecf0f1',
            borderRadius: '4px',
            marginBottom: '1rem',
        }, children: [_jsx("span", { children: "\u041F\u043E\u0434\u0430\u0447\u0430:" }), _jsx("span", { style: { fontWeight: 'bold', color: '#f39c12' }, children: servingTeamName }), _jsx("button", { onClick: () => !isLeftDisabled && onChange('A'), disabled: isLeftDisabled, style: {
                    padding: '0.25rem 0.5rem',
                    fontSize: '1rem',
                    backgroundColor: isLeftDisabled ? '#bdc3c7' : '#3498db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isLeftDisabled ? 'not-allowed' : 'pointer',
                    opacity: isLeftDisabled ? 0.5 : 1,
                }, title: isLeftDisabled ? 'Команда A уже подает' : 'Передать подачу команде A', children: "\u25C4" }), _jsx("button", { onClick: () => !isRightDisabled && onChange('B'), disabled: isRightDisabled, style: {
                    padding: '0.25rem 0.5rem',
                    fontSize: '1rem',
                    backgroundColor: isRightDisabled ? '#bdc3c7' : '#3498db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isRightDisabled ? 'not-allowed' : 'pointer',
                    opacity: isRightDisabled ? 0.5 : 1,
                }, title: isRightDisabled ? 'Команда B уже подает' : 'Передать подачу команде B', children: "\u25BA" })] }));
}
export default ServeControl;
