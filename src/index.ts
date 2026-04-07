#!/usr/bin/env node
import * as p from '@clack/prompts'
import chalk from 'chalk'
import fs from 'node:fs'
import path from 'node:path'
import { fetchMeta, generateProject } from './initializr.js'
import {
  getCurrentJavaVersion,
  hasBrew,
  hasSdkman,
  installJavaViaBrew,
  installJavaViaSdkman,
} from './java.js'
import { TEMPLATES } from './templates.js'

async function main() {
  console.log()
  p.intro(chalk.bgCyan.black(' create-spring-app '))

  // Fetch metadata from start.spring.io
  const spinner = p.spinner()
  spinner.start('Fetching Spring Initializr metadata...')
  let meta: Awaited<ReturnType<typeof fetchMeta>>
  try {
    meta = await fetchMeta()
    spinner.stop('Metadata loaded')
  } catch {
    spinner.stop(chalk.red('Failed to fetch metadata. Check your internet connection.'))
    process.exit(1)
  }

  // ── Project info ──────────────────────────────────────────
  const projectName = await p.text({
    message: 'Project name',
    placeholder: 'my-app',
    defaultValue: 'my-app',
    validate: (v) => (!v ? 'Required' : undefined),
  })
  if (p.isCancel(projectName)) { p.cancel('Cancelled'); process.exit(0) }

  const groupId = await p.text({
    message: 'Group ID',
    placeholder: 'com.example',
    defaultValue: 'com.example',
  })
  if (p.isCancel(groupId)) { p.cancel('Cancelled'); process.exit(0) }

  const description = await p.text({
    message: 'Description',
    placeholder: 'My Spring Boot project',
    defaultValue: 'My Spring Boot project',
  })
  if (p.isCancel(description)) { p.cancel('Cancelled'); process.exit(0) }

  // ── Build tool ────────────────────────────────────────────
  const build = await p.select({
    message: 'Build tool',
    initialValue: 'gradle',
    options: [
      { value: 'gradle', label: 'Gradle (Kotlin DSL)' },
      { value: 'maven', label: 'Maven' },
    ],
  })
  if (p.isCancel(build)) { p.cancel('Cancelled'); process.exit(0) }

  // ── Java version ──────────────────────────────────────────
  const LTS_VERSIONS = ['21', '17', '11']
  const defaultJava =
    LTS_VERSIONS.find((lts) => meta.javaVersions.some((v) => v.id === lts)) ??
    meta.javaVersions[0]?.id

  const javaVersion = await p.select({
    message: 'Java version',
    initialValue: defaultJava,
    options: meta.javaVersions.map((v) => ({ value: v.id, label: v.name })),
  })
  if (p.isCancel(javaVersion)) { p.cancel('Cancelled'); process.exit(0) }

  // ── Spring Boot version ───────────────────────────────────
  const stableVersions = meta.bootVersions.filter((v) => v.stable)
  const unstableVersions = meta.bootVersions.filter((v) => !v.stable)
  const bootVersion = await p.select({
    message: 'Spring Boot version',
    initialValue: stableVersions[0]?.id,
    options: [...stableVersions, ...unstableVersions].map((v) => ({
      value: v.id,
      label: v.name,
    })),
  })
  if (p.isCancel(bootVersion)) { p.cancel('Cancelled'); process.exit(0) }

  // ── Template ──────────────────────────────────────────────
  const templateKey = await p.select({
    message: 'Template',
    initialValue: 'rest-api',
    options: Object.entries(TEMPLATES).map(([key, t]) => ({
      value: key,
      label: t.label,
      hint: t.hint,
    })),
  })
  if (p.isCancel(templateKey)) { p.cancel('Cancelled'); process.exit(0) }

  // ── Dependencies ──────────────────────────────────────────
  let selectedDeps: string[] = TEMPLATES[templateKey as string].dependencies

  if (templateKey === 'custom') {
    // Group deps by category for better UX
    const groupMap = new Map<string, typeof meta.dependencies>()
    for (const dep of meta.dependencies) {
      if (!groupMap.has(dep.group)) groupMap.set(dep.group, [])
      groupMap.get(dep.group)!.push(dep)
    }

    // Pick popular groups first (limit for UX)
    const popularGroups = ['Web', 'SQL', 'Security', 'Messaging', 'Cloud', 'Ops']
    const filteredDeps = meta.dependencies.filter((d) =>
      popularGroups.some((g) => d.group.includes(g))
    )

    const chosen = await p.multiselect({
      message: 'Dependencies (space to select)',
      options: filteredDeps.map((d) => ({
        value: d.id,
        label: d.name,
        hint: d.description.slice(0, 60),
      })),
      required: false,
    })
    if (p.isCancel(chosen)) { p.cancel('Cancelled'); process.exit(0) }
    selectedDeps = chosen as string[]
  }

  // ── Confirm ───────────────────────────────────────────────
  const outputDir = path.resolve(process.cwd(), projectName as string)
  const confirmed = await p.confirm({
    message: `Generate project at ${chalk.cyan(outputDir)}?`,
  })
  if (p.isCancel(confirmed) || !confirmed) { p.cancel('Cancelled'); process.exit(0) }

  // ── Generate ──────────────────────────────────────────────
  spinner.start('Generating project...')
  try {
    const zip = await generateProject({
      groupId: groupId as string,
      artifactId: projectName as string,
      name: projectName as string,
      description: description as string,
      packageName: `${groupId}.${(projectName as string).replace(/-/g, '')}`,
      bootVersion: bootVersion as string,
      javaVersion: javaVersion as string,
      build: build as string,
      packaging: 'jar',
      dependencies: selectedDeps,
    })

    // Save zip then extract
    const zipPath = path.resolve(process.cwd(), `${projectName}.zip`)
    fs.writeFileSync(zipPath, zip)

    // Use unzip if available, else just keep zip
    const { execSync } = await import('node:child_process')
    try {
      execSync(`unzip -q "${zipPath}" -d "${outputDir}"`)
      fs.unlinkSync(zipPath)
      spinner.stop(`Project created at ${chalk.cyan(outputDir)}`)
    } catch {
      spinner.stop(`Zip saved: ${chalk.cyan(zipPath)} (unzip manually)`)
    }
  } catch (e) {
    spinner.stop(chalk.red('Failed to generate project'))
    console.error(e)
    process.exit(1)
  }

  // ── Java install ──────────────────────────────────────────
  const requiredJava = parseInt(javaVersion as string)
  const installedJava = getCurrentJavaVersion()

  if (installedJava !== requiredJava) {
    const installed = installedJava
      ? `Java ${installedJava} is installed`
      : 'No Java found on PATH'

    const installMethod = await p.select({
      message: `${installed}, but this project requires Java ${requiredJava}. Install it?`,
      options: [
        ...(hasSdkman() ? [{ value: 'sdkman', label: 'SDKMAN (sdk install java)' }] : []),
        ...(hasBrew() ? [{ value: 'brew', label: 'Homebrew (brew install openjdk)' }] : []),
        { value: 'skip', label: 'Skip — I will install manually' },
      ],
    })
    if (p.isCancel(installMethod)) { p.cancel('Cancelled'); process.exit(0) }

    if (installMethod === 'sdkman') {
      const javaSpinner = p.spinner()
      javaSpinner.start(`Installing Java ${requiredJava} via SDKMAN...`)
      try {
        installJavaViaSdkman(javaVersion as string)
        javaSpinner.stop(`Java ${requiredJava} installed via SDKMAN`)
      } catch {
        javaSpinner.stop(chalk.red(`Failed to install Java ${requiredJava} via SDKMAN`))
      }
    } else if (installMethod === 'brew') {
      const javaSpinner = p.spinner()
      javaSpinner.start(`Installing Java ${requiredJava} via Homebrew...`)
      try {
        installJavaViaBrew(javaVersion as string)
        javaSpinner.stop(`Java ${requiredJava} installed via Homebrew`)
      } catch {
        javaSpinner.stop(chalk.red(`Failed to install Java ${requiredJava} via Homebrew`))
      }
    }
  }

  // ── Next steps ────────────────────────────────────────────
  p.note(
    [
      `cd ${projectName}`,
      build === 'gradle' ? './gradlew bootRun' : './mvnw spring-boot:run',
    ].join('\n'),
    'Next steps'
  )

  p.outro(chalk.green('Happy coding! 🚀'))
}

main()
