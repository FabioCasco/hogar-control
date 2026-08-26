import { BrandMark } from './BrandMark'

export function LoadingScreen({ message = 'Preparando tu hogar…' }: { message?: string }) {
  return (
    <main className="center-screen" aria-live="polite">
      <section className="loading-card">
        <BrandMark />
        <div>
          <strong>Hogar Control</strong>
          <span>{message}</span>
        </div>
        <div className="loading-bar" aria-hidden="true"><span /></div>
      </section>
    </main>
  )
}
