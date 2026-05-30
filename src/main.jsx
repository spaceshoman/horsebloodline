import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('App crashed:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{padding:20,fontFamily:'system-ui',color:'#fff',background:'#0a0a0a',minHeight:'100vh'}}>
          <h2 style={{color:'#c8a84b'}}>🐴 血統くん - エラーが発生しました</h2>
          <p style={{color:'#fff',fontSize:14}}>ページを再読み込みしてください。問題が続く場合は以下のエラー情報を確認してください。</p>
          <pre style={{background:'#1a1a1a',padding:12,borderRadius:8,color:'#ff8888',fontSize:12,overflow:'auto'}}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <button onClick={() => location.reload()} style={{marginTop:12,padding:'10px 20px',background:'#c8a84b',color:'#0a0a0a',border:'none',borderRadius:8,cursor:'pointer',fontWeight:700}}>
            再読み込み
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
