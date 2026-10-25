#include "json_parser.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

static const char* skip_whitespace(const char *p) {
    while (*p && (*p == ' ' || *p == '\t' || *p == '\n' || *p == '\r')) {
        p++;
    }
    return p;
}

static JsonNode* parse_value(const char **ptr);

static char* parse_string_raw(const char **ptr) {
    const char *p = *ptr;
    if (*p != '\"') return NULL;
    p++;
    const char *start = p;
    size_t len = 0;

    while (*p && *p != '\"') {
        if (*p == '\\' && *(p + 1)) {
            p += 2;
            len += 2;
        } else {
            p++;
            len++;
        }
    }

    if (*p != '\"') return NULL;

    char *str = (char*)malloc(len + 1);
    if (!str) return NULL;

    const char *s = start;
    char *d = str;
    while (s < p) {
        if (*s == '\\' && *(s + 1)) {
            s++;
            switch (*s) {
                case 'n': *d++ = '\n'; break;
                case 't': *d++ = '\t'; break;
                case 'r': *d++ = '\r'; break;
                case '\"': *d++ = '\"'; break;
                case '\\': *d++ = '\\'; break;
                default: *d++ = *s; break;
            }
            s++;
        } else {
            *d++ = *s++;
        }
    }
    *d = '\0';
    *ptr = p + 1;
    return str;
}

static JsonNode* parse_object(const char **ptr) {
    const char *p = *ptr;
    if (*p != '{') return NULL;
    p++;

    JsonNode *node = (JsonNode*)calloc(1, sizeof(JsonNode));
    if (!node) return NULL;
    node->type = JSON_OBJECT;

    size_t capacity = 8;
    node->value.obj_val.fields = (JsonNode**)malloc(capacity * sizeof(JsonNode*));
    node->value.obj_val.count = 0;

    p = skip_whitespace(p);
    if (*p == '}') {
        *ptr = p + 1;
        return node;
    }

    while (*p) {
        p = skip_whitespace(p);
        if (*p != '\"') goto error;

        char *key = parse_string_raw(&p);
        if (!key) goto error;

        p = skip_whitespace(p);
        if (*p != ':') {
            free(key);
            goto error;
        }
        p++; // skip ':'

        p = skip_whitespace(p);
        JsonNode *val = parse_value(&p);
        if (!val) {
            free(key);
            goto error;
        }
        val->key = key;

        if (node->value.obj_val.count >= capacity) {
            capacity *= 2;
            node->value.obj_val.fields = (JsonNode**)realloc(
                node->value.obj_val.fields, capacity * sizeof(JsonNode*));
        }
        node->value.obj_val.fields[node->value.obj_val.count++] = val;

        p = skip_whitespace(p);
        if (*p == ',') {
            p++;
            continue;
        } else if (*p == '}') {
            p++;
            *ptr = p;
            return node;
        } else {
            goto error;
        }
    }

error:
    json_free(node);
    return NULL;
}

static JsonNode* parse_array(const char **ptr) {
    const char *p = *ptr;
    if (*p != '[') return NULL;
    p++;

    JsonNode *node = (JsonNode*)calloc(1, sizeof(JsonNode));
    if (!node) return NULL;
    node->type = JSON_ARRAY;

    size_t capacity = 8;
    node->value.array_val.items = (JsonNode**)malloc(capacity * sizeof(JsonNode*));
    node->value.array_val.count = 0;

    p = skip_whitespace(p);
    if (*p == ']') {
        *ptr = p + 1;
        return node;
    }

    while (*p) {
        p = skip_whitespace(p);
        JsonNode *item = parse_value(&p);
        if (!item) goto error;

        if (node->value.array_val.count >= capacity) {
            capacity *= 2;
            node->value.array_val.items = (JsonNode**)realloc(
                node->value.array_val.items, capacity * sizeof(JsonNode*));
        }
        node->value.array_val.items[node->value.array_val.count++] = item;

        p = skip_whitespace(p);
        if (*p == ',') {
            p++;
            continue;
        } else if (*p == ']') {
            p++;
            *ptr = p;
            return node;
        } else {
            goto error;
        }
    }

error:
    json_free(node);
    return NULL;
}

static JsonNode* parse_value(const char **ptr) {
    const char *p = skip_whitespace(*ptr);
    if (!*p) return NULL;

    if (*p == '{') {
        *ptr = p;
        return parse_object(ptr);
    } else if (*p == '[') {
        *ptr = p;
        return parse_array(ptr);
    } else if (*p == '\"') {
        *ptr = p;
        char *str = parse_string_raw(ptr);
        if (!str) return NULL;
        JsonNode *node = (JsonNode*)calloc(1, sizeof(JsonNode));
        node->type = JSON_STRING;
        node->value.str_val = str;
        return node;
    } else if (isdigit((unsigned char)*p) || *p == '-') {
        char *endptr;
        double num = strtod(p, &endptr);
        if (p == endptr) return NULL;
        *ptr = endptr;
        JsonNode *node = (JsonNode*)calloc(1, sizeof(JsonNode));
        node->type = JSON_NUMBER;
        node->value.num_val = num;
        return node;
    } else if (strncmp(p, "true", 4) == 0) {
        *ptr = p + 4;
        JsonNode *node = (JsonNode*)calloc(1, sizeof(JsonNode));
        node->type = JSON_BOOLEAN;
        node->value.bool_val = 1;
        return node;
    } else if (strncmp(p, "false", 5) == 0) {
        *ptr = p + 5;
        JsonNode *node = (JsonNode*)calloc(1, sizeof(JsonNode));
        node->type = JSON_BOOLEAN;
        node->value.bool_val = 0;
        return node;
    } else if (strncmp(p, "null", 4) == 0) {
        *ptr = p + 4;
        JsonNode *node = (JsonNode*)calloc(1, sizeof(JsonNode));
        node->type = JSON_NULL;
        return node;
    }

    return NULL;
}

JsonNode* json_parse(const char *text, const char **error_ptr) {
    if (!text) return NULL;
    const char *p = text;
    JsonNode *root = parse_value(&p);
    if (!root && error_ptr) {
        *error_ptr = p;
    }
    return root;
}

void json_free(JsonNode *node) {
    if (!node) return;
    if (node->key) free(node->key);

    switch (node->type) {
        case JSON_STRING:
            if (node->value.str_val) free(node->value.str_val);
            break;
        case JSON_ARRAY:
            for (size_t i = 0; i < node->value.array_val.count; i++) {
                json_free(node->value.array_val.items[i]);
            }
            free(node->value.array_val.items);
            break;
        case JSON_OBJECT:
            for (size_t i = 0; i < node->value.obj_val.count; i++) {
                json_free(node->value.obj_val.fields[i]);
            }
            free(node->value.obj_val.fields);
            break;
        default:
            break;
    }
    free(node);
}

JsonNode* json_object_get(const JsonNode *obj, const char *key) {
    if (!obj || obj->type != JSON_OBJECT || !key) return NULL;
    for (size_t i = 0; i < obj->value.obj_val.count; i++) {
        if (obj->value.obj_val.fields[i]->key &&
            strcmp(obj->value.obj_val.fields[i]->key, key) == 0) {
            return obj->value.obj_val.fields[i];
        }
    }
    return NULL;
}

JsonNode* json_array_get(const JsonNode *arr, size_t index) {
    if (!arr || arr->type != JSON_ARRAY) return NULL;
    if (index >= arr->value.array_val.count) return NULL;
    return arr->value.array_val.items[index];
}

size_t json_array_length(const JsonNode *arr) {
    if (!arr || arr->type != JSON_ARRAY) return 0;
    return arr->value.array_val.count;
}

double json_get_number(const JsonNode *node, double default_val) {
    if (!node) return default_val;
    if (node->type == JSON_NUMBER) return node->value.num_val;
    if (node->type == JSON_STRING) {
        char *endptr;
        double val = strtod(node->value.str_val, &endptr);
        if (endptr != node->value.str_val) return val;
    }
    return default_val;
}

const char* json_get_string(const JsonNode *node, const char *default_val) {
    if (!node || node->type != JSON_STRING) return default_val;
    return node->value.str_val;
}
