# Sourced by zskarte.sh. The value ends up in the Content-Security-Policy, so only plain http(s) origins pass.
check_embed_parents() {
    local parents="$1"
    if [[ "$parents" =~ ^(https?://[A-Za-z0-9.:-]+( https?://[A-Za-z0-9.:-]+)*)?$ ]]; then
        return 0
    fi
    echo "ZSK_EMBED_PARENTS must be a space-separated list of http(s) origins, e.g. https://intranet.example.org" >&2
    return 1
}
