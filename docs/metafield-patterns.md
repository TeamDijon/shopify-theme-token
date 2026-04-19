# Metafield patterns

Project-specific metafield conventions. Document each pattern here so consumers can rely on a known shape rather than rediscovering it.

## `breadcrumb.collection`

Gives flat Shopify collections a hierarchy that drives breadcrumbs, canonical paths, and structured data.

**Definition**

- Namespace: `breadcrumb`
- Key: `collection`
- Type: `collection_reference` (single collection)
- Placement:
  - On a **collection**: points to its parent collection (the "mother" in the hierarchy)
  - On a **product**: points to the canonical collection (preferred over `product.collections[0]`, which is insertion-ordered and unstable)

**Traversal**

Walk upward via `current.metafields.breadcrumb.collection.value` until blank. Bound the loop (e.g. `for i in (0..9)`) so a misconfigured cycle can't hang the renderer.

```liquid
assign current_collection = product.metafields.breadcrumb.collection.value | default: product.collections[0] | default: collection
assign breadcrumb_collection_list = current_collection | uniq

for i in (0..9)
  assign mother_collection = current_collection.metafields.breadcrumb.collection.value
  if mother_collection == blank
    break
  endif

  assign breadcrumb_collection_list = mother_collection | uniq | concat: breadcrumb_collection_list
  assign current_collection = mother_collection
endfor
```

After the loop, `breadcrumb_collection_list` holds `[root, ..., current]` in descent order.

**Usage**

- `snippets/utility--structured-data.liquid` — emits `BreadcrumbList` JSON-LD from this traversal
- Navigation breadcrumb components (when we author them) should reuse the same traversal

**Authoring guidance**

- On every collection that should appear in a breadcrumb trail, set `breadcrumb.collection` to its parent (or leave blank for the top-level collection)
- On every product whose canonical collection is not its first-added collection, set `breadcrumb.collection` to the canonical collection

## Adding a new metafield pattern

When a metafield convention earns recurring use across the theme:

1. Add a section here with the namespace, key, type, placement rules, and a short code example
2. Update consuming snippets/sections to reference this doc
