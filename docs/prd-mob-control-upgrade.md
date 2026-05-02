# PRD: Mob Cannon — Controle de Hordas e Upgrades

## 1. Visao e Objetivos do Produto

Mob Cannon e um jogo arcade 2.5D de sobrevivencia endless inspirado no core loop de Mob Control: canhao fixo na base inferior, hordas de mobs azuis que disparam para cima por gates multiplicadores, mobs vermelhos que descem e atacam, barreiras e base inimiga com HP, loop de checkpoint ao destruir a base, e meta-progresão persistente via loja de upgrades.

O jogo nao copia assets, marca, personagens, UI exata ou conteudo protegido de nenhum titulo existente. O objetivo e recriar a mecanica e a sensacao geral com arte original em Phaser 3 + TypeScript + Vite.

**Estado atual (f30c9d4 - "Phase 5 mobile controls and smoke hardening"):** o MVP tecnico esta implementado, funcional e verificado por smoke tests automaticos. O produto e jogavel, mas a arquitetura de `main.ts` precisa de refatoracao incremental em fases futuras.

---

## 2. Core Loop Atual

1. Jogador abre o jogo — menu exibe melhor score, melhor distancia, total de moedas, e upgrades comprados.
2. Jogador inicia a partida (Space/Enter ou tap).
3. Canhao na parte inferior central dispara mobs azuis automaticamente, disparando sempre para cima (angulo fixo em -90 graus).
4. Mobs azuis sobem e atravessam gates multiplicadores (x2, x3, +10).
5. A horda azul cresce.
6. Mobs azuis colidem com mobs vermelhos (que descem da base inimiga), barreiras e base inimiga.
7. Destruir a base inimiga atua como checkpoint: concede moedas, incrementa `checkpointsDestroyed`, recria base/barreiras com HP escalado e continua o jogo sem fim.
8. Se um mob vermelho alcana a zona de perigo do canhao, o jogador perde uma vida. Com zero vidas, game over.
9. Score, distancia, wave, checkpoints, kills e moedas sao rastreados durante a run.
10. Em game over, o jogador pode comprar upgrades (Fire Rate, Lives) no menu, que persistem em localStorage, e reiniciar.

---

## 3. Controles Implementados

### Desktop
| Tecla | Acao |
|---|---|
| Space / Enter | Iniciar run / Reiniciar (quando em menu ou gameover) |
| ArrowLeft / A | Mover canhao para a esquerda |
| ArrowRight / D | Mover canhao para a direita |
| F | Toggle fullscreen |
| 1 | Comprar upgrade de Fire Rate (atalho, menu) |
| 2 | Comprar upgrade de Lives (atalho, menu) |

### Mobile
| Gesto | Acao |
|---|---|
| Tap | Iniciar run / Reiniciar |
| Drag horizontal | Mover canhao para a esquerda ou direita |

**Invariante verificado:** o angulo do canhao e sempre -90 graus (vertical para cima). Nao ha mira diagonal ou livre.

---

## 4. Sistemas Implementados

### 4.1 Canon e Disparo
- Canhao fixo na parte inferior-central (`CANNON_X = 480`, `CANNON_Y = 470`).
- Disparo automatico com intervalo base de 0.28s, redutivel por upgrades de Fire Rate.
- Angulo fixo em -90 graus — sem mira livre.
- Movimento horizontal via teclado (ArrowLeft/Right, A/D) ou drag de pointer.
- Limites horizontais: `CANNON_MIN_X = 240`, `CANNON_MAX_X = 720`.

### 4.2 Mobs Azuis
- Spawnados pelo canhao em intervalos regulares.
- Subem verticalmente a velocidade `blueSpeed = 280 px/s`.
- Ao colidir com mob vermelho ou barreira, ambos morrem.
- Ao colidir com base inimiga, base perde HP e o mob morre.

### 4.3 Mobs Vermelhos
- Spawnados pela base inimiga em intervalos (`redSpawnInterval` comeca em 2.2s, decai por wave ate 0.75s minimo).
- Velocidade comeca em 60 px/s e aumenta 5 px/s por wave, ate +55 bonus.
- Descendem em direcao ao canhao.

### 4.4 Gates
- Tres gates fixos em Level 1: x2 (esquerda), x3 (direita), +10 (centro superior).
- `multiply`: mob entra, cria copias extras no ponto de saida.
- `add`: cria 10 mobs extras ao redor do ponto de saida.
- Regra: o mesmo mob nao e processado mais de uma vez pelo mesmo gate (Set de `processedMobIds`).
- Gates sao `GameObject.Container` com texto flutuante sobre fundo translucido.

### 4.5 Barreiras
- Tres barreiras em Level 1: centro superior (HP 16), esquerda inferior (HP 10), direita inferior (HP 10).
- HP escala 12% por wave.
- Cada colisao de mob azul remove 1 HP da barreira e mata o mob.

### 4.6 Base Inimiga
- HP inicial 65, escala +25 por checkpoint destruido.
- Posicionada no topo central (`x=480, y=58`).
- Quando destruida (HP=0): checkpoint e acionado, base e realada com HP escalado, barreiras sao recriadas com HP escalado.

### 4.7 Sistema de Checkpoint / Endless Loop
- Destruir a base inimiga incrementa `checkpointsDestroyed`.
- Moedas de recompensa: 15 por checkpoint, 50 por destruir base.
- O jogo NAO termina apos o primeiro checkpoint — continua indefinidamente com escalamento progressivo.
- `wave` incrementa a cada 18 segundos.
- A cada checkpoint: HP da base aumenta 25, barreiras escalam 12% por wave acumulado.
- Gradiente de dificuldade: intervalos de spawn vermelho diminuem, velocidade dos vermelhos aumenta.

### 4.8 Lives e Derrota
- 3 vidas iniciais + bonus por upgrades de Lives.
- Mob vermelho que alcana `cannonDangerY = 450` com raio 45px remove 1 vida.
- Com 0 vidas: modo `gameover`.
- Sistema de `dangerGraceSeconds` (45s) concede invulnerabilidade inicial.

### 4.9 Powerups
- Spawnados periodicamente (intervalo de 14s) caindo de cima.
- `shield`: protecao por 10s — mobs vermelhos nao causam dano de vida durante o efeito.
- `rapid`: multiplica taxa de disparo por 2.0 por 7s.
- Ambos aparecen como icons flutuantes com feedback visual (ring pulse, texto).

### 4.10 Loja e Meta-Progresao
- Persistente via localStorage (`mobCannon_totalCoins`, `mobCannon_upgrades`).
- Upgrades: Fire Rate (3 niveis, custos [60, 140, 280], reduz intervalo de disparo) e Lives (3 niveis, custos [40, 100, 200], +1 vida inicial por nivel).
- Melhores score e distancia tambem persistidos.

### 4.11 UI / HUD
- Menu principal: linhas de best score, best distance, coins e upgrades com custos/atalhos (1/2).
- Durante gameplay (top-center): wave, base HP, checkpoint count.
- Lives e status de powerups.
- Game over: score final, best distance, opcao de restart.

---

## 5. Debug Hooks e Testes

### Hooks Disponibilizados em `window`

| Hook | Assinatura | Proposito |
|---|---|---|
| `render_game_to_text` | `() => string` | Snapshot JSON do estado atual do jogo |
| `advanceTime` | `(ms: number) => void` | Avanca a simulacao em `ms` milissegundos |
| `debug_shop_action` | `(type: "fire" \| "lives") => ShopResult \| null` | Compra upgrade a partir do menu |
| `debug_move_cannon_to_x` | `(x: number, ms: number) => void` | Move o canhao para X e avanca tempo — para verificar invariante de angulo |

### Smoke Tests (`npm run smoke`)

Executa 7 testes contra Vite dev server via Playwright:

1. **Page title** — title e "Mob Cannon"
2. **Debug hooks exist** — `render_game_to_text`, `advanceTime`, `debug_shop_action`, `debug_move_cannon_to_x` presentes
3. **Shop upgrade fire** — compra upgrade de fire com localStorage seed, verifica deducao de moedas
4. **Shop upgrade lives** — compra upgrade de lives
5. **Start run + time advance** — inicia run com Space, avanca 45s, verifica estado valido
6. **Forward-only invariant + keyboard movement** — cannon angle = -90, ArrowLeft/Right move sem alterar angulo
7. **debug_move_cannon_to_x** — move canhao horizontalmente com o hook

### Limites dos Smoke Tests Actuais

Nao cobrem ainda:
- Estado de game over e overlay de restart
- Layering de powerups (shield + rapid em simultaneo)
- Compra de upgrade quando moedas sao insuficientes
- Compra de upgrade no nivel maximo
- Path de pointer/mobile drag (testavel com `debug_move_cannon_to_x` como proxy)
- Escalamento de barreiras e base por checkpoint

---

## 6. Arquitectura de Modulos

```
src/game/
  config.ts       — Todas as constantes de tuning (verificados como correctos pelo build)
  types.ts        — Tipos TypeScript partilhados; contem tipos legacy (Unit, Zombie, Bullet, etc.) de Runner
  progression.ts  — Leitura/escrita de localStorage, matematica de upgrades; puras, sem Phaser
  runMath.ts      — Funcoes puras: wave, distance, score, red spawn interval/speed tuning
  uiText.ts       — Funcoes puras de formatacao de texto (menu lines, HUD lines)
  debugSnapshot.ts — Serializador de entidades para debug snapshot; tipos do snapshot
  art.ts          — Factory functions Phaser (cannon, mob, gate, barrier, enemy base, powerup)
  world.ts        — Renderizacao de background/cenario
  effects.ts      — Floating text e ring pulse
  debugHooks.ts   — Declaracoes de tipo e comentarios para hooks de debug em window
src/
  main.ts         — unica Phaser Scene (GameScene); orquestracao, input, rendering, game loop, persistencia
```

---

## 7. Criterios de Aceitacao do MVP Actual

O MVP atual (f30c9d4) esta pronto quando:

- [x] `npm run build` passa com exit code 0
- [x] `npm run smoke` passa 7/7
- [x] Menu mostra best score, best distance, coins e upgrades
- [x] Disparo automatico do canhao funciona
- [x] Angulo do canhao e sempre -90 (invariante verificado)
- [x] Gates x2, x3, +10 multiplicam mobs azuis
- [x] Mobs vermelhos descem e colidem
- [x] Barreiras e base perdem HP
- [x] Destruir base atua como checkpoint e continua o jogo
- [x] Sistema de vidas funciona
- [x] Game over e restart funcionam
- [x] Upgrades persistem em localStorage
- [x] Desktop controls (Space, Arrow keys, F, 1, 2) funcionam
- [x] Mobile touch/drag funciona
- [x] Powerups shield e rapid funcionam
- [x] Moedas sao awardadas por kill, checkpoint e base destroy
- [x] Melhores score e distancia persistidos

---

## 8. Code Review e Dividas Tecnicas

### Veredicto Geral

O jogo e jogavel e verificavel. A principal divida tecnica e a concentracao de responsabilidade em `main.ts`.

### Pontos Fortes
- Hooks de debug bem desenhados e testados
- Smoke tests deterministicos com cobertura das areas criticas
- Funcoes puras ja extraidas (`runMath`, `progression`, `uiText`, `debugSnapshot`)
- Build estavel e rapido
- Stack Phaser simples sem configuracoes complexas
- LocalStorage abstraction correcta em `progression.ts`

### Riscos e findings de Prioridade Alta

**1. main.ts e demasiado grande (1464 linhas)**

GameScene orchestrates: input, rendering, spawning, collisions, UI updates, powerup timers, persistence coordination, debug hook registration. Qualquer mudanca e arriscada porque tudo esta no mesmo ficheiro. A extraccao incremental de sistemas e a prioridade numero um para a proxima fase.

**2. PRD drift**

O PRD original descreve um MVP com mira livre por mouse e vitoria ao destruir a base como fim de jogo. O produto atual e endless survival com checkpoint loop. O menu, shop, powerups e persistencia nao estavam no PRD original. Manter o PRD sincronizado com o codigo e essencial — este documento endereca esse problema.

**3. Tipos legacy em `types.ts`**

`Unit`, `Zombie`, `Bullet`, `Recruit`, `Obstacle`, `Pickup` sao tipos do runner anterior que permanecem em `types.ts` sem uso no jogo atual. Devem ser removidos numa refactorizacao segura.

**4. Testes insuficientes para cobertura completa**

Smoke tests cobrem o caminho critico mas nao cobrem: restart overlay, layer powerup, max upgrade, insufficient funds. Adicionar pelo menos mais 3-4 testes e critico antes de adicionar novas funcionalidades.

### Riscos de Prioridade Media

**5. Phaser lifecycle management**

Objetos Phaser (containers, imagens) sao criados com `scene.add` e destruidos manualmente. A extraccao de sistemas deve preservar os invariantes de cleanup e profundidade (z-order).

**6. HUD / area superior congestionada**

A area do topo (wave, HP da base, checkpoint count, lives, powerup status) pode ficar visualmente saturada. Separar em containers com z-indices claros ajudaria.

**7. Contraste visual de gates**

Gates podiam ter mais destaque visual para se distinguirem do fundo. Considerar adicionar glow ou animacao simples.

**8. Banner "DRAG TO MOVE"**

Observado como baixa visibilidade no menu mobile. Ajustar cor, tamanho ou posicao.

### Riscos de Prioridade Baixa

**9. Bundle size warning (Phaser chunk)**

Chunk de 1.5MB e esperado para Phaser. Code splitting nao e prioritario agora mas pode ser considerado quando o jogo crescer.

**10. Superficie de seguranca**

LocalStorage e cliente-only. Sem problemas de seguranca criticos detectados.

---

## 9. Roadmap de Proximas Fases

### Fase 6 — Refactor de main.ts (Prioridade MAXIMA)
Extrair sistemas incrementalmente de `main.ts` sem alterar comportamento:

1. Criar `src/game/systems/SpawnSystem.ts` — responsabilidade de spawn de mobs azuis e vermelhos.
2. Criar `src/game/systems/CollisionSystem.ts` — responsabilidade de colisoes e resolucao de combate.
3. Criar `src/game/systems/PowerupSystem.ts` — timers e efeitos de powerups.
4. Criar `src/game/systems/HudSystem.ts` — atualizacao do HUD durante gameplay.
5. Criar `src/game/systems/InputSystem.ts` — toda a logica de input (teclado + pointer).
6. Garantir que cada sistema tem testes de smoke ou unit antes de seguir.

Manter `GameScene` como coordinator apenas. Nao mudar gameplay.

### Fase 7 — Testes de Hardening
Adicionar smoke tests:

1. `testGameoverState` — avanca ate gameover, verifica overlay, verifica que hooks ainda respondem.
2. `testPowerupShield` — inicia com powerup seed, avanca, verifica invulnerabilidade.
3. `testMaxUpgrade` — tenta comprar upgrade no nivel maximo, verifica que nada quebra.
4. `testInsufficientCoins` — tenta comprar com moedas insuficientes, verifica resultado null ou idempotente.
5. `testRestartAfterGameover` — gameover, pressiona Space, verifica que run recomeca corretamente.

### Fase 8 — Polimento Visual e HUD
- Revisar layout do HUD para evitar crowding na area superior.
- Melhorar contraste dos gates (glow, animacao de flutuacao).
- Destacar "DRAG TO MOVE" no menu mobile.
- Adicionar feedback visual quando checkpoint e destruido (animacao de base).
- Considerar escala diferente para mob count crescente.

### Fase 9 — Gameplay Adicional
Depois de arquitectura limpa e cobertura de testes:

1. Mais tipos de gate (divisao, gate vermelho negativo).
2. Mobs especiais / champions periodicos.
3. Mais niveis / configuracoes de gate moveis.
4. Sistema de cards durante run (sem monetizacao).
5. Som e musica (audio browser).

### Fora de Escopo Para Estas Fases

- Multiplayer
- Ads
- Monetizacao
- Base builder
- Temporadas/eventos
- Multi-device sync

---

## 10. Tabela de Configuracoes Atuais (Referencia)

| Constante | Valor | Notas |
|---|---|---|
| `CANNON_X` | 480 | centro horizontal |
| `CANNON_Y` | 470 | perto do fundo |
| `CANNON_ANGLE` | -90° (fixo) | sem mira livre |
| `CANNON_MIN_X` | 240 | limite esquerdo |
| `CANNON_MAX_X` | 720 | limite direito |
| `KEYBOARD_CANNON_SPEED` | 320 px/s | velocidade de movimento |
| `blueSpeed` | 280 px/s | mobs azuis sobem |
| `redSpeed` | 60 + 5/wave px/s | mobs vermelhos descem |
| `fireInterval` | 0.28s base | reducible via upgrades |
| `redSpawnInterval` | 2.2s -> 0.75s min | decai por wave |
| `baseHpStart` | 65 | inicial |
| `baseHpPerCheckpoint` | +25 | escala por checkpoint |
| `waveDuration` | 18s | duracao de cada wave |
| `coinPerKill` | 1 | |
| `coinPerCheckpoint` | 15 | |
| `coinPerBaseDestroy` | 50 | |
| `upgradeFireCosts` | [60, 140, 280] | 3 niveis |
| `upgradeLivesCosts` | [40, 100, 200] | 3 niveis |
| `shieldDuration` | 10s | |
| `rapidDuration` | 7s | |
| `rapidFireMult` | 2.0x | |

---

*Ultima atualizacao: apos review de codigo f30c9d4 — Phase 5 mobile controls and smoke hardening*
*Proximo passo recomendado: Fase 6 — extraccao de sistemas de main.ts*
