#!/usr/bin/env bash
set -euo pipefail

DOMAIN_ROOT="${DOMAIN_ROOT:-astratreasury.ai}"
DOMAIN_WWW="${DOMAIN_WWW:-www.astratreasury.ai}"
EXPECTED_IP="${EXPECTED_IP:-$(curl -4 -s ifconfig.me)}"
OUT_DIR="reports/domain"
OUT_FILE="$OUT_DIR/latest-domain-check.txt"

mkdir -p "$OUT_DIR"

{
  echo "AstraTreasury Domain Check"
  echo "=========================="
  date -u
  echo
  echo "Expected server IP: $EXPECTED_IP"
  echo

  echo "DNS checks"
  echo "----------"
  echo "$DOMAIN_ROOT @8.8.8.8: $(dig +short "$DOMAIN_ROOT" A @8.8.8.8 | tr '\n' ' ')"
  echo "$DOMAIN_ROOT @1.1.1.1: $(dig +short "$DOMAIN_ROOT" A @1.1.1.1 | tr '\n' ' ')"
  echo "$DOMAIN_WWW @8.8.8.8: $(dig +short "$DOMAIN_WWW" A @8.8.8.8 | tr '\n' ' ')"
  echo "$DOMAIN_WWW @1.1.1.1: $(dig +short "$DOMAIN_WWW" A @1.1.1.1 | tr '\n' ' ')"
  echo "$DOMAIN_ROOT AAAA @8.8.8.8: $(dig +short "$DOMAIN_ROOT" AAAA @8.8.8.8 | tr '\n' ' ')"
  echo "$DOMAIN_WWW AAAA @8.8.8.8: $(dig +short "$DOMAIN_WWW" AAAA @8.8.8.8 | tr '\n' ' ')"
  echo

  echo "HTTP checks"
  echo "-----------"
  curl -I "http://$DOMAIN_ROOT" 2>/dev/null | head -n 5 || true
  echo
  curl -I "http://$DOMAIN_WWW" 2>/dev/null | head -n 5 || true
  echo

  echo "ACME challenge checks"
  echo "---------------------"
  curl -s "http://$DOMAIN_ROOT/.well-known/acme-challenge/test" || true
  echo
  curl -s "http://$DOMAIN_WWW/.well-known/acme-challenge/test" || true
  echo
  echo

  echo "HTTPS checks"
  echo "------------"
  curl -I "https://$DOMAIN_ROOT" 2>/dev/null | head -n 5 || true
  echo
  curl -I "https://$DOMAIN_WWW" 2>/dev/null | head -n 5 || true
  echo

  echo "Local service checks"
  echo "--------------------"
  curl -s http://127.0.0.1:8790/healthz || true
  echo
  curl -s http://127.0.0.1:8787/api/health | head -n 20 || true
  echo
} | tee "$OUT_FILE"
