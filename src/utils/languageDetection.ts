const extensionMap: Record<string, string> = {
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  vue: 'html',
  svelte: 'html',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  go: 'go',
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  swift: 'swift',
  cs: 'csharp',
  cpp: 'cpp',
  c: 'c',
  h: 'c',
  hpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  php: 'php',
  scala: 'scala',
  sc: 'scala',
  pl: 'perl',
  pm: 'perl',
  r: 'r',
  lua: 'lua',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  fish: 'shell',
  ps1: 'powershell',
  psd1: 'powershell',
  psm1: 'powershell',
  bat: 'bat',
  cmd: 'bat',
  sql: 'sql',
  graphql: 'graphql',
  gql: 'graphql',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  xml: 'xml',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'scss',
  less: 'less',
  md: 'markdown',
  markdown: 'markdown',
  txt: 'plaintext',
  dockerfile: 'dockerfile',
  toml: 'toml',
  ini: 'ini',
  cfg: 'ini',
  conf: 'ini',
  gitignore: 'ignore',
  env: 'shell',
  makefile: 'makefile',
  mk: 'makefile',
  cmake: 'cmake',
  gradle: 'gradle',
  groovy: 'groovy',
  dart: 'dart',
 elm: 'elm',
  hs: 'haskell',
  lhs: 'haskell',
  ex: 'elixir',
  exs: 'elixir',
  erl: 'erlang',
  hrl: 'erlang',
  clj: 'clojure',
  cljs: 'clojure',
  cljc: 'clojure',
  f: 'fortran',
  f77: 'fortran',
  f90: 'fortran',
  f95: 'fortran',
  asm: 'assembly',
  s: 'assembly',
  wasm: 'wasm',
  wat: 'wat',
  zig: 'zig',
  julia: 'julia',
  jl: 'julia',
 R: 'r',
  Rmd: 'r',
  stan: 'stan',
  mat: 'matlab',
  mm: 'objective-c',
  m: 'objective-c',
   v: 'verilog',
  sv: 'systemverilog',
  vhdl: 'vhdl',
  ada: 'ada',
  adb: 'ada',
  ads: 'ada',
  cob: 'cobol',
  cbl: 'cobol',
  pas: 'pascal',
  dpr: 'delphi',
  dfm: 'delphi',
  ml: 'fsharp',
  fs: 'fsharp',
  fsx: 'fsharp',
  fsi: 'fsharp',
  razor: 'razor',
  cshtml: 'razor',
  diff: 'diff',
  patch: 'diff',
  log: 'log',
}

export function detectLanguage(filePath: string | null): string {
  if (!filePath) {
    return 'typescript'
  }

  const fileName = filePath.split(/[\\/]/).pop() || ''
  
  if (fileName === 'Dockerfile') {
    return 'dockerfile'
  }
  
  if (fileName === 'Makefile') {
    return 'makefile'
  }
  
  if (fileName === '.gitignore' || fileName === '.dockerignore') {
    return 'ignore'
  }
  if (fileName === 'package.json' || fileName === 'package-lock.json') {
    return 'json';
  }

  const lastDotIndex = fileName.lastIndexOf('.')
  
  if (lastDotIndex === -1) {
    if (fileName === 'Makefile') {
      return 'makefile'
    }
    return 'plaintext'
  }

  const extension = fileName.slice(lastDotIndex + 1).toLowerCase()
  
  return extensionMap[extension] || 'plaintext'
}
