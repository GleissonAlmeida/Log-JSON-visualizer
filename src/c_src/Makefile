# Makefile para compilar o leitor de logs JSON e plotador em Linguagem C
CC = gcc
CFLAGS = -Wall -Wextra -O2 -std=c99
LDFLAGS = -lm

TARGET = log_plotter
SRCS = main.c json_parser.c
OBJS = $(SRCS:.c=.o)

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(OBJS) -o $(TARGET) $(LDFLAGS)
	@echo "=================================================="
	@echo "Compilacao concluida com sucesso!"
	@echo "Execute com: ./$(TARGET) sample_iot.json"
	@echo "=================================================="

%.o: %.c json_parser.h
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -f $(OBJS) $(TARGET) grafico_c.html grafico_c.dat grafico_c.gp

run: $(TARGET)
	./$(TARGET) sample_iot.json

.PHONY: all clean run
