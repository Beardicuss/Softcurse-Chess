import { Component } from 'react';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('[ErrorBoundary] Caught:', error, info?.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    width: '100%', height: '100dvh',
                    background: '#05010a',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Cinzel', serif",
                    color: '#c5a059',
                    padding: '20px',
                    boxSizing: 'border-box',
                    textAlign: 'center',
                }}>
                    <div style={{
                        fontSize: 'clamp(32px, 8vw, 64px)',
                        marginBottom: '20px',
                        textShadow: '0 0 30px rgba(197,160,89,0.5)',
                    }}>⚠</div>
                    <div style={{
                        fontSize: 'clamp(16px, 4vw, 24px)',
                        letterSpacing: '4px',
                        marginBottom: '16px',
                        fontFamily: "'Cinzel Decorative', serif",
                    }}>SOMETHING WENT WRONG</div>
                    <div style={{
                        fontSize: 'clamp(11px, 2.5vw, 14px)',
                        color: 'rgba(197,160,89,0.5)',
                        marginBottom: '30px',
                        maxWidth: '500px',
                        lineHeight: '1.6',
                    }}>
                        {this.state.error?.message || 'An unexpected error occurred.'}
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            background: 'rgba(197,160,89,0.1)',
                            border: '1px solid rgba(197,160,89,0.4)',
                            color: '#c5a059',
                            padding: '14px 36px',
                            fontSize: 'clamp(12px, 3vw, 16px)',
                            letterSpacing: '4px',
                            cursor: 'pointer',
                            fontFamily: "'Cinzel', serif",
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(197,160,89,0.25)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(197,160,89,0.1)'}
                    >
                        TAP TO RELOAD
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
