# PRD: Upgrade para jogo inspirado em Mob Control

## Objetivo

Transformar o prototipo atual em um jogo 2.5D inspirado no core loop de Mob Control: canhao, mobs, gates multiplicadores, combate de multidoes e destruicao da base inimiga.

Nao vamos copiar assets, marca, personagens, UI exata ou conteudo protegido. O objetivo e recriar a mecanica e sensacao geral com arte original.

## Visao do jogo

Um jogo arcade 2.5D onde o jogador controla um canhao na parte inferior da tela, dispara mobs azuis por gates multiplicadores e tenta criar uma multidao grande o suficiente para vencer mobs vermelhos, quebrar barreiras e destruir a base inimiga.

## Core loop

1. Jogador mira o canhao.
2. Canhao dispara mobs azuis continuamente.
3. Mobs atravessam gates multiplicadores.
4. A multidao cresce.
5. Mobs azuis colidem com mobs vermelhos e barreiras.
6. Sobreviventes atacam a base inimiga.
7. Vitoria ao destruir a base.
8. Derrota se inimigos alcancarem o canhao.

## MVP

Implementar primeiro:

- Canhao fixo no bottom center.
- Mira com mouse/toque.
- Disparo automatico enquanto joga.
- Mobs azuis individuais.
- Gates azuis `x2`, `x3`, `+10`.
- Mobs multiplicam ao atravessar gates.
- Mobs vermelhos descem da base inimiga.
- Combate mob azul vs mob vermelho.
- Barreiras numeradas.
- Base inimiga com HP.
- Vitoria, derrota e restart.
- Visual 2.5D com profundidade, sombras e escala.

## Remover ou substituir do prototipo atual

Remover ou desativar:

- Squad controlavel.
- Merge de tanques.
- Pickups atuais como mecanica principal.
- Estrutura de endless runner como loop principal.

Reaproveitar:

- Phaser, Vite e TypeScript.
- Projecao 2.5D.
- Efeitos visuais simples.
- Estrutura modular em `src/game`.

## Controles

Desktop:

- Mouse move: mira o canhao.
- Click/hold opcional: acelerar disparo ou disparar manualmente.
- Space: iniciar/reiniciar.

Mobile:

- Drag horizontal: mirar.
- Hold: disparar, se usarmos disparo manual.
- Tap: iniciar/reiniciar.

Para MVP, usar auto-fire com mira por mouse/drag.

## Sistemas tecnicos

Estrutura sugerida:

```text
src/game/
  config.ts
  projection.ts
  types.ts
  art.ts
  world.ts
  effects.ts
  systems/
    CannonSystem.ts
    MobSystem.ts
    GateSystem.ts
    CombatSystem.ts
    LevelSystem.ts
```

## Entidades

### Cannon

- Posicao fixa.
- Angulo de mira.
- Fire cooldown.

### Mob

- Team: `blue` ou `red`.
- Posicao.
- Velocidade.
- HP/damage simples.

### Gate

- Type: `multiply`, `add`, `subtract`, `divide`.
- Value.
- Bounds.
- Lista de mobs ja processados para evitar multiplicacao repetida no mesmo gate.

### Barrier

- HP.
- Posicao.

### Base

- Team.
- HP.
- Spawn timer para inimigos.

## Regras de gate

MVP:

- `x2`: mob entra, cria 1 copia extra.
- `x3`: mob entra, cria 2 copias extras.
- `+10`: cria 10 mobs extras em torno do ponto de saida.

Regra importante:

- O mesmo mob nao pode ser processado mais de uma vez pelo mesmo gate.

## Combate

MVP simples:

- Quando mob azul toca mob vermelho, ambos morrem.
- Quando mob azul toca barreira, barreira perde 1 HP e o mob morre.
- Quando mob azul toca base inimiga, base perde 1 HP e o mob morre.
- Quando mob vermelho toca canhao/base do jogador, derrota imediata.

## Level design inicial

Level 1:

- 2 gates azuis:
  - `x2` a esquerda.
  - `x3` a direita.
- 1 barreira pequena no centro.
- Base inimiga no topo com `HP 80`.
- Spawns vermelhos lentos.

Level 2 futuro:

- Gates moveis.
- Gate ruim vermelho.
- Duas barreiras.
- Base HP maior.

## Visual

Direcao:

- 2.5D mobile arcade.
- Tabuleiro vertical.
- Canhao grande embaixo.
- Mobs pequenos azuis/vermelhos com sombras.
- Gates como placas translúcidas flutuantes.
- Base inimiga no topo com numero grande de HP.
- Feedback satisfatorio quando a multidao cresce.

Paleta:

- Azul para player.
- Vermelho/laranja para inimigos.
- Verde/grama e areia no mapa.
- Gates azuis brilhantes para positivo.
- Gates vermelhos para negativo.

## UI

MVP:

- Top left: `Level`.
- Top center: enemy base HP.
- Top right: mob count atual.
- Center feedback: `x3!`, `+10!`, `Base Damaged`.
- Game over/victory modal simples.

## Criterios de aceitacao

O MVP esta pronto quando:

- O jogador consegue mirar o canhao.
- O canhao dispara mobs azuis.
- Mobs atravessam gates e multiplicam.
- Multidao azul cresce visualmente.
- Inimigos vermelhos aparecem e colidem.
- Barreiras e base perdem HP.
- Existe vitoria.
- Existe derrota.
- Restart funciona.
- `npm run build` passa.
- Browser smoke test passa.
- Screenshot mostra claramente canhao, mobs, gates e base.

## Plano de implementacao

1. Criar tipos novos: `Mob`, `Gate`, `Barrier`, `Base`, `Cannon`.
2. Substituir o `GameScene` atual pelo novo loop de batalha.
3. Implementar canhao e mira.
4. Implementar spawn/disparo de mobs azuis.
5. Implementar movimento de mobs.
6. Implementar gates multiplicadores.
7. Implementar inimigos vermelhos.
8. Implementar colisoes.
9. Implementar base, barreira, vitoria e derrota.
10. Fazer pass visual 2.5D.
11. Rodar build e browser regression.

## Fora de escopo inicial

- Meta progression.
- Loja.
- Cards.
- Champions.
- Ads.
- Multiplayer.
- Base builder.
- Temporadas/eventos.
- Monetizacao.

Esses elementos podem vir depois que o core estiver divertido.
