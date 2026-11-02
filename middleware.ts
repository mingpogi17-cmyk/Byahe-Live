import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Kunin ang session token ng Firebase (kung meron man)
  const session = request.cookies.get('__session')?.value
  const isAuthPage = request.nextUrl.pathname.startsWith('/ldrrmo') || request.nextUrl.pathname.startsWith('/admin')

  // Kung sasampa sa protected route pero walang session cookie, ipasa muna (Client-side mag-hahandle ng Firebase Auth)
  // Pero kung gusto mong i-hard block, pwede natin itong gawing redirect sa login page.
  // Sa ngayon, papayagan muna natin ang client-side auth pero lalagyan natin ng secure headers.
  
  const response = NextResponse.next()
  
  // Basic Security Headers (Anti-clickjacking, XSS protection)
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  return response
}

export const config = {
  matcher: ['/ldrrmo/:path*', '/admin/:path*'],
}