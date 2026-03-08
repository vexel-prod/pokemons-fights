import Link from 'next/link'
import App from '../App'

export default function Page() {
  return (
    <div id='root'>
      <div className='flex justify-end'>
        <Link
          href='/hub'
          className='text-xs md:text-sm rounded-lg border border-zinc-300/40 px-3 py-1.5 hover:bg-zinc-900/45 transition-colors'
        >
          Хаб прогресса
        </Link>
      </div>
      <App />
    </div>
  )
}
