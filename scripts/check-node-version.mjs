import * as process from 'node:process'

const [major] = process.versions.node.split('.').map(Number)

if (Number.isNaN(major) || major < 17) {
  throw new Error(
    `Node.js 17+ is required. Detected ${process.versions.node}. Please upgrade Node.js and run npm install again.`,
  )
}

console.log(`Node.js version check passed (${process.versions.node}).`)
