# Makefile — 远端 Supabase 命令快捷方式
#
# 只包含需要长 --db-url flag 的远端命令。
# 本地命令（start / stop / reset / migration new）直接用 supabase CLI。
#
# 用前提：项目根目录有 .env.cli（gitignored，复制 .env.cli.example）。
# 跑 `make help` 看可用 target。所有 recipe 必须 TAB 缩进。

.DEFAULT_GOAL := help
.PHONY: help list push pull diff repair

help:
	@echo "可用命令（都需要 .env.cli，仅用于远端 DB 操作）："
	@echo "  make list                            查 migration 本地/远端对齐"
	@echo "  make push                            推新 migration 到远端"
	@echo "  make pull                            从远端 schema 反向生成 migration"
	@echo "  make diff                            看本地 vs 远端 schema 差异"
	@echo "  make repair MIG=20260521000001       标记 migration 为已应用"
	@echo ""
	@echo "本地命令直接用原生 supabase：start / stop / status / db reset / migration new"

list:
	@. ./.env.cli && supabase migration list --db-url "$$SUPABASE_DB_URL"

push:
	@. ./.env.cli && supabase db push --db-url "$$SUPABASE_DB_URL"

pull:
	@. ./.env.cli && supabase db pull --db-url "$$SUPABASE_DB_URL"

diff:
	@. ./.env.cli && supabase db diff --linked --db-url "$$SUPABASE_DB_URL"

repair:
	@if [ -z "$(MIG)" ]; then echo "Usage: make repair MIG=<timestamp>"; exit 1; fi
	@. ./.env.cli && supabase migration repair --status applied $(MIG) --db-url "$$SUPABASE_DB_URL"
