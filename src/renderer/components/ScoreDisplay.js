import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo } from 'react';
const ScoreDisplay = memo(function ScoreDisplay({ teamA, teamB, scoreA, scoreB, servingTeam, isSetball = false, setballTeam = null, isMatchball = false, matchballTeam = null, teamALogo = null, teamBLogo = null, }) {
    return (_jsxs("div", { style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2rem',
            fontSize: '2rem',
            fontWeight: 'bold',
            padding: '1rem',
            position: 'relative',
        }, children: [teamALogo && (_jsx("div", { style: {
                    width: '120px',
                    height: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    padding: '0.5rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }, children: _jsx("img", { src: teamALogo, alt: teamA, style: {
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                    } }) })), _jsxs("div", { style: {
                    textAlign: 'center',
                    color: servingTeam === 'A' ? '#f39c12' : '#34495e',
                    position: 'relative',
                    minWidth: '150px',
                }, children: [_jsx("div", { children: teamA }), _jsxs("div", { style: {
                            fontSize: '3rem',
                            position: 'relative',
                        }, children: [scoreA, (isMatchball && matchballTeam === 'A') || (isSetball && setballTeam === 'A' && !isMatchball) ? (_jsx("div", { style: {
                                    position: 'absolute',
                                    top: '-10px',
                                    right: '-20px',
                                    padding: '0.25rem 0.5rem',
                                    backgroundColor: isMatchball ? '#e74c3c' : '#f39c12',
                                    color: 'white',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    fontWeight: 'bold',
                                    whiteSpace: 'nowrap',
                                    zIndex: 10,
                                }, children: isMatchball ? 'МАТЧБОЛ' : 'СЕТБОЛ' })) : null] })] }), _jsx("div", { style: { fontSize: '2rem' }, children: ":" }), _jsxs("div", { style: {
                    textAlign: 'center',
                    color: servingTeam === 'B' ? '#f39c12' : '#34495e',
                    position: 'relative',
                    minWidth: '150px',
                }, children: [_jsx("div", { children: teamB }), _jsxs("div", { style: {
                            fontSize: '3rem',
                            position: 'relative',
                        }, children: [scoreB, (isMatchball && matchballTeam === 'B') || (isSetball && setballTeam === 'B' && !isMatchball) ? (_jsx("div", { style: {
                                    position: 'absolute',
                                    top: '-10px',
                                    left: '-20px',
                                    padding: '0.25rem 0.5rem',
                                    backgroundColor: isMatchball ? '#e74c3c' : '#f39c12',
                                    color: 'white',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    fontWeight: 'bold',
                                    whiteSpace: 'nowrap',
                                    zIndex: 10,
                                }, children: isMatchball ? 'МАТЧБОЛ' : 'СЕТБОЛ' })) : null] })] }), teamBLogo && (_jsx("div", { style: {
                    width: '120px',
                    height: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    padding: '0.5rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }, children: _jsx("img", { src: teamBLogo, alt: teamB, style: {
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                    } }) }))] }));
});
export default ScoreDisplay;
