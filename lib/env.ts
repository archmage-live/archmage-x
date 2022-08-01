export class Env {
  inServiceWorker: boolean = false

  constructor() {
    if (typeof window === 'undefined') {
      this.inServiceWorker = true
    }
  }
}

export const ENV = new Env()
