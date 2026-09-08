import React from 'react';

function MataMata() {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Mata-Mata 🏆</h2>
      <p>Chaveamento das fases eliminatórias.</p>

      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '40px', flexWrap: 'wrap', gap: '20px' }}>
        
        {/* Coluna das Semifinais */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', justifyContent: 'center' }}>
          
          <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', backgroundColor: '#f9f9f9', minWidth: '220px' }}>
            <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>Semifinal 1</h4>
            <p style={{ margin: '5px 0', padding: '5px', backgroundColor: '#fff', border: '1px solid #eee' }}>1º do Grupo A</p>
            <p style={{ margin: '5px 0', padding: '5px', backgroundColor: '#fff', border: '1px solid #eee' }}>2º do Grupo B</p>
          </div>

          <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', backgroundColor: '#f9f9f9', minWidth: '220px' }}>
            <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>Semifinal 2</h4>
            <p style={{ margin: '5px 0', padding: '5px', backgroundColor: '#fff', border: '1px solid #eee' }}>1º do Grupo B</p>
            <p style={{ margin: '5px 0', padding: '5px', backgroundColor: '#fff', border: '1px solid #eee' }}>2º do Grupo A</p>
          </div>

        </div>

        {/* Coluna da Final */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          
          <div style={{ border: '2px solid #f1c40f', padding: '20px', borderRadius: '8px', backgroundColor: '#fffdf0', minWidth: '250px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#d35400' }}>GRANDE FINAL 🥇</h3>
            <p style={{ margin: '5px 0', padding: '8px', backgroundColor: '#fff', border: '1px solid #eee', fontWeight: 'bold' }}>Vencedor Semifinal 1</p>
            <p style={{ margin: '10px 0', fontSize: '12px', color: '#7f8c8d' }}>X</p>
            <p style={{ margin: '5px 0', padding: '8px', backgroundColor: '#fff', border: '1px solid #eee', fontWeight: 'bold' }}>Vencedor Semifinal 2</p>
          </div>

        </div>

      </div>
    </div>
  );
}

export default MataMata;