import { Link } from 'react-router-dom'
import { APP_NAME } from '../constants'
import { Wordmark } from '../components/space/Wordmark'

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-8">
      <title>{`Not found · ${APP_NAME}`}</title>
      <meta name="robots" content="noindex" />
      <Link to="/" aria-label="Orbit Lab home" className="self-start rounded-md">
        <Wordmark />
      </Link>
      <div className="flex flex-1 flex-col justify-center">
        <p className="label-mono text-primary">Signal lost // 404</p>
        <h1 className="mt-4 max-w-[14ch] text-5xl font-semibold leading-[1.05] text-foreground sm:text-6xl">
          This coordinate is empty space.
        </h1>
        <p className="mt-4 max-w-[46ch] text-muted-foreground">The page you asked for is not on any station manifest.</p>
        <Link
          to="/home"
          className="mt-8 inline-flex h-12 w-fit items-center rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground transition-[filter] hover:brightness-110"
        >
          Back to mission control
        </Link>
      </div>
    </div>
  )
}
