import { execSync, spawnSync } from 'node:child_process'

/** Returns the major Java version currently on PATH, or null if not found. */
export function getCurrentJavaVersion(): number | null {
  const result = spawnSync('java', ['-version'], { encoding: 'utf8' })
  const output = (result.stderr ?? '') + (result.stdout ?? '')
  const match = output.match(/version "(?:1\.)?(\d+)/)
  return match ? parseInt(match[1]) : null
}

export function hasSdkman(): boolean {
  try {
    execSync('bash -lc "source \\"$HOME/.sdkman/bin/sdkman-init.sh\\" && sdk version"', {
      stdio: 'pipe',
    })
    return true
  } catch {
    return false
  }
}

export function hasBrew(): boolean {
  try {
    execSync('which brew', { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

/** Install via SDKMAN using Eclipse Temurin distribution. */
export function installJavaViaSdkman(version: string): void {
  execSync(
    `bash -lc "source \\"$HOME/.sdkman/bin/sdkman-init.sh\\" && sdk install java ${version}-tem"`,
    { stdio: 'inherit' }
  )
}

/** Install via Homebrew and attempt to create the JVM symlink. */
export function installJavaViaBrew(version: string): void {
  execSync(`brew install openjdk@${version}`, { stdio: 'inherit' })
  try {
    execSync(
      `sudo ln -sfn "$(brew --prefix)/opt/openjdk@${version}/libexec/openjdk.jdk" /Library/Java/JavaVirtualMachines/openjdk-${version}.jdk`,
      { stdio: 'inherit' }
    )
  } catch {
    // symlink is optional — Homebrew will print the manual step
  }
}
