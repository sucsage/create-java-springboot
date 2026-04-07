export interface Dependency {
  id: string
  name: string
  description: string
  group: string
}

export interface BootVersion {
  id: string
  name: string
  stable: boolean
}

export interface InitializrMeta {
  dependencies: Dependency[]
  bootVersions: BootVersion[]
  javaVersions: { id: string; name: string }[]
}

export async function fetchMeta(): Promise<InitializrMeta> {
  const res = await fetch('https://start.spring.io', {
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) throw new Error('Failed to fetch Spring Initializr metadata')

  const data = await res.json() as any

  const dependencies: Dependency[] = []
  for (const group of data.dependencies.values) {
    for (const dep of group.values) {
      dependencies.push({
        id: dep.id,
        name: dep.name,
        description: dep.description ?? '',
        group: group.name,
      })
    }
  }

  const bootVersions: BootVersion[] = data.bootVersion.values.map((v: any) => {
    const unstable = /snapshot|milestone|-m\d+|-rc\d+/i.test(v.id + v.name)
    return {
      id: v.id,
      name: unstable ? `${v.name} ⚠ unstable` : v.name,
      stable: !unstable,
    }
  })

  const javaVersions = data.javaVersion.values.map((v: any) => ({
    id: v.id,
    name: v.name,
  }))

  return { dependencies, bootVersions, javaVersions }
}

export async function generateProject(opts: {
  groupId: string
  artifactId: string
  name: string
  description: string
  packageName: string
  bootVersion: string
  javaVersion: string
  build: string
  packaging: string
  dependencies: string[]
}): Promise<Buffer> {
  const params = new URLSearchParams({
    groupId: opts.groupId,
    artifactId: opts.artifactId,
    name: opts.name,
    description: opts.description,
    packageName: opts.packageName,
    bootVersion: opts.bootVersion,
    javaVersion: opts.javaVersion,
    type: opts.build === 'gradle' ? 'gradle-project' : 'maven-project',
    packaging: opts.packaging,
    language: 'java',
    dependencies: opts.dependencies.join(','),
  })

  const res = await fetch(`https://start.spring.io/starter.zip?${params}`)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Failed to generate project (HTTP ${res.status}): ${body}`)
  }

  const buffer = await res.arrayBuffer()
  return Buffer.from(buffer)
}
