export interface Template {
  label: string
  hint: string
  dependencies: string[]
}

export const TEMPLATES: Record<string, Template> = {
  'rest-api': {
    label: 'REST API',
    hint: 'Web + JPA + PostgreSQL + Validation',
    dependencies: ['web', 'data-jpa', 'postgresql', 'validation'],
  },
  'full-stack': {
    label: 'Full Stack',
    hint: 'Web + JPA + Security + Thymeleaf + PostgreSQL',
    dependencies: ['web', 'data-jpa', 'security', 'thymeleaf', 'postgresql', 'validation'],
  },
  microservice: {
    label: 'Microservice',
    hint: 'Web + Actuator + Config Client + Eureka Discovery',
    dependencies: ['web', 'actuator', 'cloud-config-client', 'cloud-eureka'],
  },
  minimal: {
    label: 'Minimal',
    hint: 'Spring Web only',
    dependencies: ['web'],
  },
  custom: {
    label: 'Custom',
    hint: 'Pick your own dependencies',
    dependencies: [],
  },
}
