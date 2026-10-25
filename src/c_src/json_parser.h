#ifndef JSON_PARSER_H
#define JSON_PARSER_H

#include <stddef.h>

/* Tipos de valores JSON */
typedef enum {
    JSON_NULL = 0,
    JSON_BOOLEAN,
    JSON_NUMBER,
    JSON_STRING,
    JSON_ARRAY,
    JSON_OBJECT
} JsonType;

typedef struct JsonNode JsonNode;

/* Estrutura de nó de árvore JSON */
struct JsonNode {
    JsonType type;
    char *key;              /* Nome da chave (se dentro de objeto) */
    
    union {
        int bool_val;
        double num_val;
        char *str_val;
        struct {
            JsonNode **items;
            size_t count;
        } array_val;
        struct {
            JsonNode **fields;
            size_t count;
        } obj_val;
    } value;
};

/* Funções de manipulação */
JsonNode* json_parse(const char *text, const char **error_ptr);
void json_free(JsonNode *node);

/* Auxiliares de consulta */
JsonNode* json_object_get(const JsonNode *obj, const char *key);
JsonNode* json_array_get(const JsonNode *arr, size_t index);
size_t json_array_length(const JsonNode *arr);
double json_get_number(const JsonNode *node, double default_val);
const char* json_get_string(const JsonNode *node, const char *default_val);

#endif /* JSON_PARSER_H */
